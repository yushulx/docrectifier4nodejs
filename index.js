if (process.platform === 'win32') {
    console.log('Windows');
}
else if (process.platform === 'linux') {
    console.log('Linux');
}
else if (process.platform === 'darwin') {
    console.log('macOS');
}
else {
    console.log('Unknown Operating System');
}

var Template = {
    binary: [
        '{',
        '    "GlobalParameter":{',
        '        "Name":"GP"',
        '    },',
        '    "ImageParameterArray":[',
        '        {',
        '            "Name":"IP-1",',
        '            "NormalizerParameterName":"NP-1",',
        '            "BinarizationModes":[{"Mode":"BM_LOCAL_BLOCK", "ThresholdCompensation":9}],',
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
        '            "BinarizationModes":[{"Mode":"BM_LOCAL_BLOCK", "ThresholdCompensation":9}],',
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
        '            "BinarizationModes":[{"Mode":"BM_LOCAL_BLOCK", "ThresholdCompensation":9}],',
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

var docrectifier = require('./build/Release/docrectifier');
var DocRectifier = /** @class */ (function () {
    function DocRectifier() {
        this.obj = docrectifier.DocRectifier();
    }
    DocRectifier.initLicense = function (license) {
        return docrectifier.initLicense(license);
    };
    DocRectifier.getVersionNumber = function () {
        return docrectifier.getVersionNumber();
    };
    DocRectifier.prototype.save = function (filePath) {
        var _this = this;
        return _this.obj.save(filePath);
    };
    DocRectifier.prototype.getParameters = function () {
        var _this = this;
        return _this.obj.getParameters();
    };
    DocRectifier.prototype.setParameters = function (params) {
        var _this = this;
        return _this.obj.setParameters(params);
    };
    DocRectifier.prototype.detectFileAsync = function (filePath) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.obj.detectFileAsync(filePath, function (err, result) {
                setTimeout(function () {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(result);
                    }
                }, 0);
            });
        });
    };
    DocRectifier.prototype.detectBufferAsync = function (buffer, width, height, stride) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.obj.detectBufferAsync(buffer, width, height, stride, function (err, result) {
                setTimeout(function () {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(result);
                    }
                }, 0);
            });
        });
    };
    DocRectifier.prototype.normalizeFileAsync = function (filePath, x1, y1, x2, y2, x3, y3, x4, y4) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.obj.normalizeFileAsync(filePath, x1, y1, x2, y2, x3, y3, x4, y4, function (err, result) {
                setTimeout(function () {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(result);
                    }
                }, 0);
            });
        });
    };
    DocRectifier.prototype.normalizeBufferAsync = function (buffer, width, height, stride, x1, y1, x2, y2, x3, y3, x4, y4) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.obj.normalizeBufferAsync(buffer, width, height, stride, x1, y1, x2, y2, x3, y3, x4, y4, function (err, result) {
                setTimeout(function () {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(result);
                    }
                }, 0);
            });
        });
    };
    DocRectifier.Template = Template;
    return DocRectifier;
}());
module.exports = DocRectifier;
