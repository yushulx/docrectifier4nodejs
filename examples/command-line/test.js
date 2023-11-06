const sharp = require('sharp');
var DocRectifier = require('../../index.js');

const path = require('path');
console.log(DocRectifier.getVersionNumber());
DocRectifier.initLicense('DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==');

var obj = new DocRectifier();
obj.setParameters(DocRectifier.Template.binary);

sharp('../../images/document.png')
  .raw() // This ensures the image data is returned as raw pixel data
  .toBuffer((err, data, info) => {
    if (err) throw err;

    const width = info.width;
    const height = info.height;
    const stride = info.size / info.height;

    (async function () {
      try {

        let results = await obj.detectBufferAsync(data, width, height, stride);
        console.log(results);
        let result = results[0];
        result = await obj.normalizeBufferAsync(data, width, height, stride, result['x1'], result['y1'], result['x2'], result['y2'], result['x3'], result['y3'], result['x4'], result['y4']);
        obj.save('test.png');
      } catch (error) {
        console.log(error);
      }
    })();
  });