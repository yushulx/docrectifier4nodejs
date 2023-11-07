const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const app = express();
const http = require('http');
const server = http.createServer(app);
const bodyParser = require('body-parser');
const upload = multer({ dest: 'uploads/' });
const DocRectifier = require('../../index.js');
DocRectifier.initLicense('DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==');
var obj = new DocRectifier();
obj.setParameters(DocRectifier.Template.color);

app.use(express.static('public'));
app.use('/node_modules', express.static(__dirname + '/node_modules'));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.post('/rectifydocument', upload.single('image'), async (req, res) => {
    const file = req.file;

    if (!file) {
        return res.status(400).send('No file uploaded.');
    }

    try {
        console.log('Uploaded file details:', file);
        let results = await obj.detectFileAsync(file.path);
        console.log(results);
        let result = results[0];
        result = await obj.normalizeFileAsync(file.path, result['x1'], result['y1'], result['x2'], result['y2'], result['x3'], result['y3'], result['x4'], result['y4']);
        console.log(result);

        let data = result['data']
        let width = result['width']
        let height = result['height']
        for (let i = 0; i < data.length; i += 4) {
            const red = data[i];
            const blue = data[i + 2];
            data[i] = blue;
            data[i + 2] = red;
        }
        sharp(data, {
            raw: {
                width: width,
                height: height,
                channels: 4
            }
        })
            .jpeg() // Convert to JPEG
            .toBuffer() // Convert to buffer
            .then(jpegBuffer => {
                res.set('Content-Type', 'application/octet-stream');
                res.send(jpegBuffer);
            })
            .catch(err => {
                console.error(err);
                res.status(500).send('An error occurred while processing the image.');
            });
    }
    catch (err) {
        console.error(err);
        return res.status(500).send('An error occurred while processing the image.');
    }

});

// Start the server
const port = process.env.PORT || 3000;

server.listen(port, '0.0.0.0', () => {
    host = server.address().address;
    console.log(`Server running at http://0.0.0.0:${port}/`);
});
