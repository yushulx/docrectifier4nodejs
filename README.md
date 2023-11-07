# Node.js Document Rectification

The Node.js Document Rectification SDK is a Node binding to [Dynamsoft Label Recognizer C++ SDK](https://www.dynamsoft.com/document-normalizer/docs/core/introduction/?ver=latest). It helps developers build Node.js applications for document rectification on Windows and Linux.


## License Key 
Get a [30-day FREE trial license](https://www.dynamsoft.com/customer/license/trialLicense/?product=ddn) to activate the SDK.

## Pre-requisites
- [Node.js](https://nodejs.org/en/download/)
- Platform-specific C/C++ compiler
- node-gyp

    ```
    npm i node-gyp -g
    ```

## Supported Platforms
- **Windows**
- **Linux**

## Quick Start
Set the `LICENSE-KEY` and specify the `image-file` in the code below:
```js
const DocRectifier = require('docrectifier4nodejs');
DocRectifier.initLicense('LICENSE-KEY');

var obj = new DocRectifier();
(async function () {
try {
    obj.setParameters(DocRectifier.Template.color);
    let results = await obj.detectFileAsync('image-file');
    let result = results[0];
    result = await obj.normalizeFileAsync('image-file', result['x1'], result['y1'], result['x2'], result['y2'], result['x3'], result['y3'], result['x4'], result['y4']);
    obj.save('test.png');
} catch (error) {
    console.log(error);
}
})();

```

## API
- `initLicense(licenseKey)`
- `setParameters(template)`
- `getParameters()`
- `detectFileAsync(imageFile, callback)`
- `detectBufferAsync(imageBuffer, width, height, stride, callback)`
- `normalizeFileAsync(imageFile, x1, y1, x2, y2, x3, y3, x4, y4, callback)`
- `normalizeBufferAsync(imageBuffer, width, height, stride, x1, y1, x2, y2, x3, y3, x4, y4, callback)`
- `save(imageFile)`

## Examples
- [Command Line](https://github.com/yushulx/nodejs-document-rectification/tree/main/examples/command-line)
- [Web](https://github.com/yushulx/nodejs-document-rectification/tree/main/examples/web)