'use strict';

/**
 * docrectifier4nodejs
 *
 * Document edge detection and rectification for Node.js.
 *
 * The public API is unchanged, but the engine is now the pure JavaScript
 * `dynamsoft-capture-vision-for-node` SDK - no node-gyp build step and no
 * prebuilt native addon.
 *
 * Detection runs inside Capture Vision; the perspective correction of an
 * explicit quadrilateral is done here in JavaScript from the original pixels
 * that the SDK hands back, which keeps `normalize*Async(file, x1..y4)` working
 * exactly like the old native binding.
 */

const path = require('node:path');
const zlib = require('node:zlib');

const {
    CaptureVisionRouter,
    LicenseManager,
    EnumImagePixelFormat
} = require('dynamsoft-capture-vision-for-node');

/* ------------------------------------------------------------------ */
/* Legacy templates (kept byte for byte for API compatibility)         */
/* ------------------------------------------------------------------ */

const Template = {
    binary: [
        '{',
        '    "GlobalParameter":{',
        '        "Name":"GP"',
        '    },',
        '    "ImageParameterArray":[',
        '        {',
        '            "Name":"IP-1",',
        '            "NormalizerParameterName":"NP-1",',
        '            "BinarizationModes":[{"Mode":"BM_LOCAL_BLOCK", "ThresholdCompensation":10}],',
        '            "ScaleDownThreshold":2300',
        '        }',
        '    ],',
        '    "NormalizerParameterArray":[',
        '        {',
        '            "Name":"NP-1",',
        '            "ColourMode": "ICM_BINARY"',
        '        }',
        '    ]',
        '}'
    ].join('\n'),

    color: [
        '{',
        '    "GlobalParameter":{',
        '        "Name":"GP"',
        '    },',
        '    "ImageParameterArray":[',
        '        {',
        '            "Name":"IP-1",',
        '            "NormalizerParameterName":"NP-1",',
        '            "BinarizationModes":[{"Mode":"BM_LOCAL_BLOCK", "ThresholdCompensation":10}],',
        '            "ScaleDownThreshold":2300',
        '        }',
        '    ],',
        '    "NormalizerParameterArray":[',
        '        {',
        '            "Name":"NP-1",',
        '            "ColourMode": "ICM_COLOUR"',
        '        }',
        '    ]',
        '}'
    ].join('\n'),

    grayscale: [
        '{',
        '    "GlobalParameter":{',
        '        "Name":"GP"',
        '    },',
        '    "ImageParameterArray":[',
        '        {',
        '            "Name":"IP-1",',
        '            "NormalizerParameterName":"NP-1",',
        '            "BinarizationModes":[{"Mode":"BM_LOCAL_BLOCK", "ThresholdCompensation":10}],',
        '            "ScaleDownThreshold":2300',
        '        }',
        '    ],',
        '    "NormalizerParameterArray":[',
        '        {',
        '            "Name":"NP-1",',
        '            "ColourMode": "ICM_GRAYSCALE"',
        '        }',
        '    ]',
        '}'
    ].join('\n')
};

/* ------------------------------------------------------------------ */
/* Capture Vision settings                                             */
/* ------------------------------------------------------------------ */

const GRAB_TEMPLATE = 'DocRectifierGrabOriginal';
const GRAB_ROI = 'roi-normalize-document';

let settingsApplied = false;
let inflight = 0;
let idleTimer = null;

function sdkRoot() {
    return path.dirname(path.dirname(require.resolve('dynamsoft-capture-vision-for-node')));
}

function presetSettings() {
    const file = path.join(sdkRoot(), 'Templates', 'DDN-PresetTemplates.json');
    const presets = JSON.parse(require('node:fs').readFileSync(file, 'utf-8'));

    // A template that only asks for the original pixels. The normalizer ROI is a
    // no-op without a detected quad, so this is cheap and we get the full image.
    presets.CaptureVisionTemplates.push({
        Name: GRAB_TEMPLATE,
        ImageROIProcessingNameArray: [GRAB_ROI],
        OutputOriginalImage: 1
    });

    return presets;
}

function applySettings(settings) {
    CaptureVisionRouter.initSettings(settings || presetSettings());
    settingsApplied = true;
}

function ensureSettings() {
    if (!settingsApplied) {
        applySettings(null);
    }
}

/**
 * The SDK keeps a worker pool alive; shut it down shortly after the last capture
 * so short-lived scripts can exit.
 */
function scheduleIdleTermination() {
    if (idleTimer) {
        clearTimeout(idleTimer);
    }
    idleTimer = setTimeout(function () {
        idleTimer = null;
        if (inflight === 0) {
            CaptureVisionRouter.terminateIdleWorkers().catch(function () { });
        }
    }, 100);
    if (typeof idleTimer.unref === 'function') {
        idleTimer.unref();
    }
}

async function capture(source, templateName) {
    ensureSettings();
    inflight++;
    if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
    }
    try {
        return await CaptureVisionRouter.captureAsync(source, {
            templateName: templateName,
            dataTransferType: 'copy'
        });
    } finally {
        inflight--;
        if (inflight === 0) {
            scheduleIdleTermination();
        }
    }
}

/* ------------------------------------------------------------------ */
/* Pixel helpers                                                       */
/* ------------------------------------------------------------------ */

function toImageData(buffer, width, height, stride) {
    const bytes = buffer instanceof Uint8Array
        ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
        : new Uint8Array(buffer);

    let format = EnumImagePixelFormat.IPF_RGB_888;
    if (width === stride) {
        format = EnumImagePixelFormat.IPF_GRAYSCALED;
    } else if (width * 4 === stride) {
        format = EnumImagePixelFormat.IPF_ARGB_8888;
    }

    return { bytes: bytes, width: width, height: height, stride: stride, format: format };
}

/**
 * The SDK hands back a native buffer object (`{ toUint8Array() }`), not a
 * Uint8Array, so unwrap it before touching individual pixels.
 */
function unwrapImageData(imageData) {
    const raw = imageData.bytes;
    return {
        bytes: raw && typeof raw.toUint8Array === 'function' ? raw.toUint8Array() : raw,
        width: imageData.width,
        height: imageData.height,
        stride: imageData.stride,
        format: imageData.format
    };
}

function readPixel(image, x, y, out) {
    const stride = image.stride;
    const format = image.format;
    const offset = y * stride + x * (format === EnumImagePixelFormat.IPF_GRAYSCALED ? 1
        : format === EnumImagePixelFormat.IPF_RGB_888 ? 3 : 4);
    const data = image.bytes;

    if (format === EnumImagePixelFormat.IPF_GRAYSCALED) {
        out[0] = data[offset];
        out[1] = data[offset];
        out[2] = data[offset];
    } else if (format === EnumImagePixelFormat.IPF_RGB_888) {
        out[0] = data[offset];
        out[1] = data[offset + 1];
        out[2] = data[offset + 2];
    } else {
        // ARGB_8888: A, R, G, B
        out[0] = data[offset + 1];
        out[1] = data[offset + 2];
        out[2] = data[offset + 3];
    }
}

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

function distance(a, b) {
    return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}

/**
 * Homography that maps the four source points onto the unit rectangle scaled to
 * width x height. Returns the 8 coefficients of the inverse mapping (dst -> src)
 * so the warp can sample the source directly.
 */
function invertHomography(src, width, height) {
    const dst = [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height },
        { x: 0, y: height }
    ];

    // Solve A * h = b for h = [h11 h12 h13 h21 h22 h23 h31 h32]
    const a = [];
    const b = [];
    for (let i = 0; i < 4; i++) {
        const sx = src[i].x, sy = src[i].y;
        const dx = dst[i].x, dy = dst[i].y;
        a.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
        b.push(dx);
        a.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
        b.push(dy);
    }

    // Gaussian elimination with partial pivoting
    for (let col = 0; col < 8; col++) {
        let pivot = col;
        for (let row = col + 1; row < 8; row++) {
            if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) {
                pivot = row;
            }
        }
        if (Math.abs(a[pivot][col]) < 1e-12) {
            return null;
        }
        const tmpA = a[col]; a[col] = a[pivot]; a[pivot] = tmpA;
        const tmpB = b[col]; b[col] = b[pivot]; b[pivot] = tmpB;

        for (let row = 0; row < 8; row++) {
            if (row === col) continue;
            const factor = a[row][col] / a[col][col];
            if (factor === 0) continue;
            for (let k = col; k < 8; k++) {
                a[row][k] -= factor * a[col][k];
            }
            b[row] -= factor * b[col];
        }
    }

    const h = [];
    for (let i = 0; i < 8; i++) {
        h.push(b[i] / a[i][i]);
    }

    // Forward matrix (src -> dst)
    const H = [
        [h[0], h[1], h[2]],
        [h[3], h[4], h[5]],
        [h[6], h[7], 1]
    ];

    // Invert the 3x3 matrix (dst -> src)
    const det = H[0][0] * (H[1][1] * H[2][2] - H[1][2] * H[2][1])
        - H[0][1] * (H[1][0] * H[2][2] - H[1][2] * H[2][0])
        + H[0][2] * (H[1][0] * H[2][1] - H[1][1] * H[2][0]);
    if (Math.abs(det) < 1e-12) {
        return null;
    }

    return [
        (H[1][1] * H[2][2] - H[1][2] * H[2][1]) / det,
        (H[0][2] * H[2][1] - H[0][1] * H[2][2]) / det,
        (H[0][1] * H[1][2] - H[0][2] * H[1][1]) / det,
        (H[1][2] * H[2][0] - H[1][0] * H[2][2]) / det,
        (H[0][0] * H[2][2] - H[0][2] * H[2][0]) / det,
        (H[0][2] * H[1][0] - H[0][0] * H[1][2]) / det,
        (H[1][0] * H[2][1] - H[1][1] * H[2][0]) / det,
        (H[0][1] * H[2][0] - H[0][0] * H[2][1]) / det,
        (H[0][0] * H[1][1] - H[0][1] * H[1][0]) / det
    ];
}

function otsuThreshold(gray) {
    const histogram = new Array(256).fill(0);
    for (let i = 0; i < gray.length; i++) {
        histogram[gray[i]]++;
    }

    const total = gray.length;
    let sum = 0;
    for (let i = 0; i < 256; i++) {
        sum += i * histogram[i];
    }

    let sumB = 0;
    let wB = 0;
    let max = 0;
    let threshold = 127;
    for (let t = 0; t < 256; t++) {
        wB += histogram[t];
        if (wB === 0) continue;
        const wF = total - wB;
        if (wF === 0) break;
        sumB += t * histogram[t];
        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;
        const between = wB * wF * (mB - mF) * (mB - mF);
        if (between > max) {
            max = between;
            threshold = t;
        }
    }
    return threshold;
}

/**
 * Rectify the quadrilateral out of the source image.
 * Returns the same object shape the native binding produced.
 */
function rectify(image, quad, colourMode) {
    let width = Math.round(Math.max(distance(quad[0], quad[1]), distance(quad[3], quad[2])));
    let height = Math.round(Math.max(distance(quad[0], quad[3]), distance(quad[1], quad[2])));
    width = Math.max(1, width);
    height = Math.max(1, height);

    const inverse = invertHomography(quad, width, height);
    if (!inverse) {
        throw new Error('docrectifier4nodejs: the quadrilateral is degenerate.');
    }

    const rgba = Buffer.alloc(width * height * 4);
    const gray = colourMode === 'ICM_COLOUR' ? null : new Uint8Array(width * height);
    const pixel = [0, 0, 0];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const denom = inverse[6] * x + inverse[7] * y + inverse[8];
            const sx = (inverse[0] * x + inverse[1] * y + inverse[2]) / denom;
            const sy = (inverse[3] * x + inverse[4] * y + inverse[5]) / denom;

            let r = 255, g = 255, b = 255;
            if (sx >= 0 && sy >= 0 && sx <= image.width - 1 && sy <= image.height - 1) {
                // Nearest neighbour is plenty for a rectified scan and keeps this fast.
                readPixel(image, Math.round(sx), Math.round(sy), pixel);
                r = pixel[0];
                g = pixel[1];
                b = pixel[2];
            }

            const index = (y * width + x) * 4;
            if (gray) {
                const luma = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
                gray[y * width + x] = luma;
                rgba[index] = luma;
                rgba[index + 1] = luma;
                rgba[index + 2] = luma;
            } else {
                rgba[index] = r;
                rgba[index + 1] = g;
                rgba[index + 2] = b;
            }
            rgba[index + 3] = 255;
        }
    }

    if (colourMode === 'ICM_BINARY') {
        const threshold = otsuThreshold(gray);
        for (let i = 0; i < gray.length; i++) {
            const value = gray[i] > threshold ? 255 : 0;
            rgba[i * 4] = value;
            rgba[i * 4 + 1] = value;
            rgba[i * 4 + 2] = value;
        }
    }

    return {
        width: width,
        height: height,
        stride: width * 4,
        format: EnumImagePixelFormat.IPF_ARGB_8888,
        orientation: 0,
        length: rgba.length,
        data: rgba
    };
}

/* ------------------------------------------------------------------ */
/* Result helpers                                                      */
/* ------------------------------------------------------------------ */

function toQuadResults(captured) {
    const results = [];
    const items = (captured && captured.detectedQuadResultItems) || [];

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const points = (item.location && item.location.points) || [];
        if (points.length < 4) continue;
        results.push({
            confidence: item.confidenceAsDocumentBoundary,
            x1: points[0].x,
            y1: points[0].y,
            x2: points[1].x,
            y2: points[1].y,
            x3: points[2].x,
            y3: points[2].y,
            x4: points[3].x,
            y4: points[3].y
        });
    }

    return results;
}

function toQuad(x1, y1, x2, y2, x3, y3, x4, y4) {
    return [
        { x: Math.round(x1), y: Math.round(y1) },
        { x: Math.round(x2), y: Math.round(y2) },
        { x: Math.round(x3), y: Math.round(y3) },
        { x: Math.round(x4), y: Math.round(y4) }
    ];
}

function callbackify(promise, callback) {
    if (callback && typeof callback === 'function') {
        promise.then(function (result) {
            callback(null, result);
        }, function (err) {
            callback(err);
        });
        return undefined;
    }
    return promise;
}

/* ------------------------------------------------------------------ */
/* Minimal PNG encoder (RGBA, 8 bit)                                   */
/* ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[n] = c;
    }
    return table;
})();

function crc32(buffer) {
    let crc = -1;
    for (let i = 0; i < buffer.length; i++) {
        crc = CRC_TABLE[(crc ^ buffer[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ -1) >>> 0;
}

function pngChunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const typeBuffer = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
    return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(rgba, width, height) {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;  // bit depth
    ihdr[9] = 6;  // colour type: RGBA

    // One filter byte (0 = none) in front of every scanline
    const raw = Buffer.alloc((width * 4 + 1) * height);
    for (let y = 0; y < height; y++) {
        const src = y * width * 4;
        const dst = y * (width * 4 + 1);
        raw[dst] = 0;
        rgba.copy(raw, dst + 1, src, src + width * 4);
    }

    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
        pngChunk('IHDR', ihdr),
        pngChunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
        pngChunk('IEND', Buffer.alloc(0))
    ]);
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

class DocRectifier {
    constructor() {
        this._colourMode = 'ICM_COLOUR';
        this._parameters = null;
        this._image = null;
    }

    static initLicense(license) {
        try {
            LicenseManager.initLicense(String(license));
            return 0;
        } catch (err) {
            console.error('InitLicense: ' + (err && err.message ? err.message : err));
            return err && typeof err.dcvErrorCode === 'number' ? err.dcvErrorCode : -1;
        }
    }

    static getVersionNumber() {
        return CaptureVisionRouter.version;
    }

    /**
     * Accepts the legacy Document Normalizer runtime settings JSON. Only the
     * colour mode is honoured (ICM_COLOUR / ICM_GRAYSCALE / ICM_BINARY); a full
     * Capture Vision settings object is forwarded to the SDK as-is.
     */
    setParameters(params) {
        let parsed = params;
        if (typeof params === 'string') {
            try {
                parsed = JSON.parse(params);
            } catch (err) {
                console.error('setParameters: invalid JSON');
                return -1;
            }
        }

        if (!parsed || typeof parsed !== 'object') {
            return -1;
        }

        if (Array.isArray(parsed.CaptureVisionTemplates)) {
            this._parameters = parsed;
            this._colourMode = 'ICM_COLOUR';
            try {
                applySettings(parsed);
                return 0;
            } catch (err) {
                console.error('setParameters: ' + (err && err.message ? err.message : err));
                return -1;
            }
        }

        this._parameters = parsed;
        const normalizer = (parsed.NormalizerParameterArray || [])[0];
        if (normalizer && typeof normalizer.ColourMode === 'string') {
            this._colourMode = normalizer.ColourMode;
        }
        return 0;
    }

    getParameters() {
        if (this._parameters && Array.isArray(this._parameters.CaptureVisionTemplates)) {
            return JSON.stringify(this._parameters);
        }
        return JSON.stringify({
            GlobalParameter: { Name: 'GP' },
            ImageParameterArray: [{
                Name: 'IP-1',
                NormalizerParameterName: 'NP-1',
                BinarizationModes: [{ Mode: 'BM_LOCAL_BLOCK', ThresholdCompensation: 10 }],
                ScaleDownThreshold: 2300
            }],
            NormalizerParameterArray: [{ Name: 'NP-1', ColourMode: this._colourMode }]
        });
    }

    detectFileAsync(filePath, callback) {
        const promise = (async () => {
            const captured = await capture(String(filePath), 'DetectDocumentBoundaries_Default');
            return toQuadResults(captured);
        })();
        return callbackify(promise, callback);
    }

    detectBufferAsync(buffer, width, height, stride, callback) {
        const promise = (async () => {
            const captured = await capture(toImageData(buffer, width, height, stride), 'DetectDocumentBoundaries_Default');
            return toQuadResults(captured);
        })();
        return callbackify(promise, callback);
    }

    normalizeFileAsync() {
        const args = Array.prototype.slice.call(arguments);
        const callback = typeof args[args.length - 1] === 'function' ? args.pop() : null;
        const filePath = args[0];

        const promise = (async () => {
            const captured = await capture(String(filePath), GRAB_TEMPLATE);
            const original = (captured.originalImageItems || [])[0];
            if (!original) {
                throw new Error('docrectifier4nodejs: the SDK did not return the original image.');
            }
            const result = rectify(unwrapImageData(original.imageData), toQuad(args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8]), this._colourMode);
            this._image = result;
            return result;
        })();
        return callbackify(promise, callback);
    }

    normalizeBufferAsync() {
        const args = Array.prototype.slice.call(arguments);
        const callback = typeof args[args.length - 1] === 'function' ? args.pop() : null;

        const promise = (async () => {
            const image = toImageData(args[0], args[1], args[2], args[3]);
            const result = rectify(image, toQuad(args[4], args[5], args[6], args[7], args[8], args[9], args[10], args[11]), this._colourMode);
            this._image = result;
            return result;
        })();
        return callbackify(promise, callback);
    }

    save(filePath) {
        if (!this._image) {
            return -1;
        }
        try {
            // The SDK's ImageIO.saveToFile() is unusable here (it throws on every
            // input), so the rectified image is encoded as PNG in pure JavaScript.
            const png = encodePng(this._image.data, this._image.width, this._image.height);
            require('node:fs').writeFileSync(String(filePath), png);
            return 0;
        } catch (err) {
            console.error('save: ' + (err && err.message ? err.message : err));
            return -1;
        }
    }
}

DocRectifier.Template = Template;

module.exports = DocRectifier;
