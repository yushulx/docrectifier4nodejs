const sharp = require('sharp');
var DocRectifier = require('../../index.js');

const path = require('path');
console.log(DocRectifier.getVersionNumber());
DocRectifier.initLicense('DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==');

var obj = new DocRectifier();
obj.setParameters(DocRectifier.Template.color);

sharp('../../images/document.png')
  .raw() // This ensures the image data is returned as raw pixel data
  .toBuffer((err, data, info) => {
    if (err) throw err;

    for (let i = 0; i < data.length; i += info.channels) {
      const red = data[i];
      const blue = data[i + 2];
      data[i] = blue;      // Set the red channel to the original blue channel's value
      data[i + 2] = red;   // Set the blue channel to the original red channel's value
    }

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

        // data = result['data']
        // for (let i = 0; i < data.length; i += info.channels) {
        //   const red = data[i];
        //   const blue = data[i + 2];
        //   data[i] = blue;      
        //   data[i + 2] = red;   
        // }
        // sharp(data, {
        //   raw: {
        //     width: result['width'],
        //     height: result['height'],
        //     channels: 4
        //   }
        // })
        //   .toFile('output.png', (err, info) => {
        //     if (err) throw err;
        //     // 'info' contains details about the output image
        //     console.log(info);
        //   });
      } catch (error) {
        console.log(error);
      }
    })();
  });