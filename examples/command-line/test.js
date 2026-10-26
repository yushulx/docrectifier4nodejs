'use strict';

/**
 * Command-line document rectification.
 *
 *   node test.js                     # uses ../../images/document.png
 *   node test.js path/to/photo.jpg
 */

const path = require('node:path');
const DocRectifier = require('../../index.js');

// Get a license key from
// https://www.dynamsoft.com/customer/license/trialLicense/?product=dcv&package=cross-platform
const LICENSE_KEY = process.env.DCV_LICENSE ||
    'DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==';

const image = process.argv[2] || path.join(__dirname, '..', '..', 'images', 'document.png');

console.log(DocRectifier.getVersionNumber());
DocRectifier.initLicense(LICENSE_KEY);

const rectifier = new DocRectifier();
rectifier.setParameters(DocRectifier.Template.color);

(async function () {
    const quads = await rectifier.detectFileAsync(image);
    console.log('Detected boundaries:');
    console.log(quads);

    if (quads.length === 0) {
        console.log('No document found.');
        return;
    }

    const quad = quads[0];
    const result = await rectifier.normalizeFileAsync(image,
        quad.x1, quad.y1, quad.x2, quad.y2, quad.x3, quad.y3, quad.x4, quad.y4);

    console.log('Rectified image: ' + result.width + 'x' + result.height + ', ' + result.length + ' bytes of RGBA data');

    rectifier.save('test.png');
    console.log('Saved the rectified document to test.png');
})().catch(function (err) {
    console.error(err);
    process.exitCode = 1;
});
