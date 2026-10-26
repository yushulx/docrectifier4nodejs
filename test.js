'use strict';

/**
 * Test suite / sample.
 *
 *   node test.js
 *   DCV_LICENSE=YOUR-KEY node test.js
 */

const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('pngjs');

const DocRectifier = require('./index.js');

const LICENSE = process.env.DCV_LICENSE ||
    'DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==';

const IMAGE = path.join(__dirname, 'images', 'document.png');
const OUTPUT = path.join(__dirname, 'test.png');

let pass = 0;
let fail = 0;

function check(name, ok, detail) {
    if (ok) {
        pass++;
        console.log('PASS  ' + name + (detail ? '  |  ' + detail : ''));
    } else {
        fail++;
        console.log('FAIL  ' + name + (detail ? '  |  ' + detail : ''));
    }
}

function pngToRgb(file) {
    const png = PNG.sync.read(fs.readFileSync(file));
    const rgb = Buffer.alloc(png.width * png.height * 3);
    for (let i = 0; i < png.width * png.height; i++) {
        rgb[i * 3] = png.data[i * 4];
        rgb[i * 3 + 1] = png.data[i * 4 + 1];
        rgb[i * 3 + 2] = png.data[i * 4 + 2];
    }
    return { rgb, width: png.width, height: png.height };
}

(async function () {
    check('API surface', typeof DocRectifier === 'function' &&
        typeof DocRectifier.initLicense === 'function' &&
        typeof DocRectifier.getVersionNumber === 'function' &&
        typeof DocRectifier.Template === 'object' &&
        ['binary', 'color', 'grayscale'].every(function (key) { return typeof DocRectifier.Template[key] === 'string'; }) &&
        ['detectFileAsync', 'detectBufferAsync', 'normalizeFileAsync', 'normalizeBufferAsync', 'save', 'setParameters', 'getParameters']
            .every(function (method) { return typeof DocRectifier.prototype[method] === 'function'; }));

    if (DocRectifier.initLicense(LICENSE) !== 0) {
        console.log('\nLicense unavailable - skipping the rectification tests.');
        if (fail) {
            process.exitCode = 1;
        }
        return;
    }
    check('initLicense', true);
    check('getVersionNumber', typeof DocRectifier.getVersionNumber() === 'string', DocRectifier.getVersionNumber());

    const rectifier = new DocRectifier();

    // setParameters / getParameters round-trip
    check('setParameters(color)', rectifier.setParameters(DocRectifier.Template.color) === 0);
    const params = JSON.parse(rectifier.getParameters());
    check('getParameters round-trip',
        params.NormalizerParameterArray[0].ColourMode === 'ICM_COLOUR',
        params.NormalizerParameterArray[0].ColourMode);

    // Detection from a file
    const quads = await rectifier.detectFileAsync(IMAGE);
    check('detectFileAsync finds a quad', quads.length >= 1, quads.length + ' quad(s)');

    const quad = quads[0];
    const hasShape = ['confidence', 'x1', 'y1', 'x2', 'y2', 'x3', 'y3', 'x4', 'y4']
        .every(function (key) { return key in quad; });
    check('quad shape', hasShape, 'confidence=' + quad.confidence +
        ' p1=' + quad.x1 + ',' + quad.y1);

    // Rectification from a file
    const rectified = await rectifier.normalizeFileAsync(IMAGE, quad.x1, quad.y1, quad.x2, quad.y2, quad.x3, quad.y3, quad.x4, quad.y4);
    const expectedLength = rectified.width * rectified.height * 4;
    check('normalizeFileAsync geometry',
        rectified.width > 100 && rectified.height > rectified.width,
        rectified.width + 'x' + rectified.height);
    check('normalizeFileAsync data', rectified.length === expectedLength && rectified.data.length === expectedLength,
        'stride=' + rectified.stride + ' bytes=' + rectified.length);

    // The rectified image must not be blank
    let nonWhite = 0;
    for (let i = 0; i < rectified.data.length; i += 4) {
        if (rectified.data[i] < 200) nonWhite++;
    }
    check('rectified image has content', nonWhite > rectified.width * rectified.height * 0.01,
        Math.round(nonWhite * 100 / (rectified.width * rectified.height)) + '% dark pixels');

    // save()
    if (fs.existsSync(OUTPUT)) {
        fs.unlinkSync(OUTPUT);
    }
    check('save', rectifier.save(OUTPUT) === 0 && fs.existsSync(OUTPUT), OUTPUT);
    const saved = PNG.sync.read(fs.readFileSync(OUTPUT));
    check('saved png matches the result',
        saved.width === rectified.width && saved.height === rectified.height,
        saved.width + 'x' + saved.height);

    // Buffer based API
    const source = pngToRgb(IMAGE);
    const bufferQuads = await rectifier.detectBufferAsync(source.rgb, source.width, source.height, source.width * 3);
    check('detectBufferAsync', bufferQuads.length >= 1, bufferQuads.length + ' quad(s)');

    const bufferQuad = bufferQuads[0];
    const bufferRectified = await rectifier.normalizeBufferAsync(source.rgb, source.width, source.height, source.width * 3,
        bufferQuad.x1, bufferQuad.y1, bufferQuad.x2, bufferQuad.y2, bufferQuad.x3, bufferQuad.y3, bufferQuad.x4, bufferQuad.y4);
    check('normalizeBufferAsync geometry',
        Math.abs(bufferRectified.width - rectified.width) <= 1 && Math.abs(bufferRectified.height - rectified.height) <= 1,
        bufferRectified.width + 'x' + bufferRectified.height + ' vs ' + rectified.width + 'x' + rectified.height);

    // Grayscale and binary colour modes
    rectifier.setParameters(DocRectifier.Template.grayscale);
    const gray = await rectifier.normalizeFileAsync(IMAGE, quad.x1, quad.y1, quad.x2, quad.y2, quad.x3, quad.y3, quad.x4, quad.y4);
    let isGray = true;
    for (let i = 0; i < gray.data.length; i += 4) {
        if (gray.data[i] !== gray.data[i + 1] || gray.data[i] !== gray.data[i + 2]) {
            isGray = false;
            break;
        }
    }
    check('ICM_GRAYSCALE output is gray', isGray);

    rectifier.setParameters(DocRectifier.Template.binary);
    const binary = await rectifier.normalizeFileAsync(IMAGE, quad.x1, quad.y1, quad.x2, quad.y2, quad.x3, quad.y3, quad.x4, quad.y4);
    let isBinary = true;
    for (let i = 0; i < binary.data.length; i += 4) {
        const v = binary.data[i];
        if (v !== 0 && v !== 255) {
            isBinary = false;
            break;
        }
    }
    check('ICM_BINARY output is black and white', isBinary);

    // Callback style
    await new Promise(function (resolve) {
        rectifier.setParameters(DocRectifier.Template.color);
        rectifier.detectFileAsync(IMAGE, function (err, result) {
            check('callback style', !err && Array.isArray(result) && result.length >= 1);
            resolve();
        });
    });

    console.log('\n==== ' + pass + ' passed, ' + fail + ' failed ====');
    if (fail) {
        process.exitCode = 1;
    }
})().catch(function (err) {
    console.error(err);
    process.exitCode = 1;
});
