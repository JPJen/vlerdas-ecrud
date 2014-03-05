var stream = require('stream');
var util = require('util');

function StripBOMTransformStream(options) {
    if (!(this instanceof StripBOMTransformStream)) {
        return new StripBOMTransformStream(options);
    }

    stream.Transform.call(this, options);
    
    this.dataCounter = 0;
}

util.inherits(StripBOMTransformStream, stream.Transform);

StripBOMTransformStream.prototype._transform = function(data, encoding, done) {
    if (this.dataCounter++ === 0) {
        // utf8 signature on a utf8 file is 0xef, 0xbb, 0xbf
        // could try and edit the Buffer directly instead of converting to string
        // but this was faster to implement at the moment...
        var dataStr = data.toString('utf8');
        var firstChar = dataStr.substring(0, 1);
        var bomChar = '\uFEFF';
        // Byte Order Mark character
        if (firstChar === bomChar) {
            dataStr = dataStr.substring(1);
            data = new Buffer(dataStr, 'utf8');
        }
    }
    
    this.push(data);
    
    done();
};

module.exports.StripBOMTransformStream = StripBOMTransformStream;