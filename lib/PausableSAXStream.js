var sax = require('sax');
var util = require('util');

function PausableSAXStream(strict, opt) {
    if (!(this instanceof PausableSAXStream)) {
        return new PausableSAXStream(strict, opt);
    }
    
    sax.SAXStream.call(this, strict, opt);
    this.flowing = true;
}

util.inherits(PausableSAXStream, sax.SAXStream);

PausableSAXStream.prototype.write = function (data) {
    // write always returns true making it useless in a pipe().
    sax.SAXStream.prototype.write.call(this, data);
    
    // return state of flowing to let pipe know when it can and can't send
    // data to this stream.
    return this.flowing;
};

PausableSAXStream.prototype.pause = function () {
    this.flowing = false;
};

PausableSAXStream.prototype.resume = function () {
    this.flowing = true;
    // emit a drain event to start the flow again.
    this.emit('drain');
};

function createStream(strict, opt) {
    return new PausableSAXStream(strict, opt);
}

module.exports.PausableSAXStream = PausableSAXStream;
module.exports.createStream = createStream;
