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
    DocRectifier.prototype.detectFileAsync = function () {
        var _this = this;
        var filename = arguments[0];
        var callback = arguments[1];
        const promise = new Promise((resolve, reject) => {
            _this.obj.detectFileAsync(filename, function (err, result) {
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

        if (callback && typeof callback === 'function') {
            promise
                .then(result => callback(null, result))
                .catch(err => callback(err));
        } else {
            return promise;
        }
    };
    DocRectifier.prototype.detectBufferAsync = function () {
        var _this = this;
        var buffer = arguments[0];
        var width = arguments[1];
        var height = arguments[2];
        var stride = arguments[3];
        var callback = arguments[4];
        const promise = new Promise((resolve, reject) => {
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

        if (callback && typeof callback === 'function') {
            promise
                .then(result => callback(null, result))
                .catch(err => callback(err));
        } else {
            return promise;
        }
    };
    DocRectifier.prototype.normalizeFileAsync = function () {
        var _this = this;
        var filePath = arguments[0];
        var x1 = arguments[1];
        var y1 = arguments[2];
        var x2 = arguments[3];
        var y2 = arguments[4];
        var x3 = arguments[5];
        var y3 = arguments[6];
        var x4 = arguments[7];
        var y4 = arguments[8];
        var callback = arguments[9];
        const promise = new Promise((resolve, reject) => {
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

        if (callback && typeof callback === 'function') {
            promise
                .then(result => callback(null, result))
                .catch(err => callback(err));
        } else {
            return promise;
        }
    };
    DocRectifier.prototype.normalizeBufferAsync = function () {
        var _this = this;
        var buffer = arguments[0];
        var width = arguments[1];
        var height = arguments[2];
        var stride = arguments[3];
        var x1 = arguments[4];
        var y1 = arguments[5];
        var x2 = arguments[6];
        var y2 = arguments[7];
        var x3 = arguments[8];
        var y3 = arguments[9];
        var x4 = arguments[10];
        var y4 = arguments[11];
        var callback = arguments[12];
        const promise = new Promise((resolve, reject) => {
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

        if (callback && typeof callback === 'function') {
            promise
                .then(result => callback(null, result))
                .catch(err => callback(err));
        } else {
            return promise;
        }
    };
    DocRectifier.Template = Template;
    return DocRectifier;
}());
module.exports = DocRectifier;
