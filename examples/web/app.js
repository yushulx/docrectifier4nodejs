'use strict';

/**
 * Web document rectification sample.
 *
 *   npm install
 *   node app.js
 *
 * Then open http://localhost:2025 and pick a photo of a document.
 */

const fs = require('node:fs');
const path = require('node:path');

const express = require('express');
const multer = require('multer');

const DocRectifier = require('../../index.js');

// Get a license key from
// https://www.dynamsoft.com/customer/license/trialLicense/?product=dcv&package=cross-platform
const LICENSE_KEY = process.env.DCV_LICENSE ||
    'DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==';

const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

DocRectifier.initLicense(LICENSE_KEY);

const rectifier = new DocRectifier();
rectifier.setParameters(DocRectifier.Template.color);

const app = express();
const upload = multer({ dest: UPLOAD_DIR });

app.use(express.static(path.join(__dirname, 'public')));

app.post('/rectifydocument', upload.single('image'), async function (req, res) {
    const file = req.file;
    if (!file) {
        return res.status(400).type('text/plain').send('No file uploaded.');
    }

    const outputPath = path.join(UPLOAD_DIR, file.filename + '.png');

    try {
        const quads = await rectifier.detectFileAsync(file.path);
        console.log('Detected boundaries:', quads);

        if (quads.length === 0) {
            return res.type('text/plain').send('No document detected.');
        }

        const quad = quads[0];
        const result = await rectifier.normalizeFileAsync(file.path,
            quad.x1, quad.y1, quad.x2, quad.y2, quad.x3, quad.y3, quad.x4, quad.y4);

        console.log('Rectified image: ' + result.width + 'x' + result.height);

        if (rectifier.save(outputPath) !== 0) {
            throw new Error('Failed to save the rectified image.');
        }

        // The page expects an octet-stream blob it can show in an <img>.
        res.set('Content-Type', 'application/octet-stream');
        res.send(fs.readFileSync(outputPath));
    } catch (err) {
        console.error(err);
        res.status(500).type('text/plain').send('An error occurred while processing the image.');
    } finally {
        fs.unlink(file.path, function () { });
        fs.unlink(outputPath, function () { });
    }
});

const port = process.env.PORT || 2025;
app.listen(port, function () {
    console.log('Server running at http://localhost:' + port + '/');
});
