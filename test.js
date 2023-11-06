const path = require('path');
const DocRectifier = require('./index');
console.log(DocRectifier.getVersionNumber());
DocRectifier.initLicense('DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==');

var obj = new DocRectifier();
(async function () {
    try {
        obj.setParameters(DocRectifier.Template.color);
        let results = await obj.detectFileAsync('./images/document.png');
        console.log(results);
        let result = results[0];
        result = await obj.normalizeFileAsync('./images/document.png', result['x1'], result['y1'], result['x2'], result['y2'], result['x3'], result['y3'], result['x4'], result['y4']);
        obj.save('test.png');
    } catch (error) {
        console.log(error);
    }
})();
