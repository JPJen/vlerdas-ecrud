var stream = require('stream');
var util = require('util');
var config = require('config');
var logger = require('vcommons').log.getLogger('eCrud', config.log);

GridFSWriteStream = function(options) {
    if (!(this instanceof GridFSWriteStream)) {
        return new GridFSWriteStream(options);
    }
    
    stream.Writable.call(this, options);
    this.options = options || {};
    this.db = this.options.db;
    this.mongo = this.options.mongo;
    this.id = new this.mongo.BSONPure.ObjectID;
    this.name = this.options.filename;
    this.mode = this.options.mode && /^w[+]?$/.test(this.options.mode) ? this.options.mode : 'w+';

    this._gridStore = new this.mongo.GridStore(this.db, this.id || this.name, this.name, this.mode, this.options);
};

util.inherits(GridFSWriteStream, stream.Writable);

GridFSWriteStream.prototype.end = function (chunk, encoding, callback) {
    var _self = this;
    
    // defer emitting 'finish' event until after we've had a chance to close the
    // GridStore.
    var listeners = _self.listeners('finish');
    _self.removeAllListeners('finish');
    
    // invoke Writable.end.  It'll take care of writing out the last chunk.
    // We'll close the GridStore and emit 'finish' when it's done.
    stream.Writable.prototype.end.call(_self, chunk, encoding, function () {
        _self._gridStore.close(function (err, file) {
            if (!err) {
                _self.file = file;
            }

            for (i = 0;  i < listeners.length;  ++i) {
                _self.addListener('finish', listeners[i]);
            }

            // add callback to listeners.
            if (callback) {
                _self.once(callback);
            }
            
            _self.emit('finish', err);
        });
    });
};

GridFSWriteStream.prototype._write = function (chunk, encoding, callback) {
    if (!this._opened) {
        this._writeOpenFirst(chunk, encoding, callback);
    }
    else {
        this._writeDirect(chunk, encoding, callback);
    }
};

GridFSWriteStream.prototype._writeOpenFirst = function (chunk, encoding, callback) {
    var _self = this;
    _self._gridStore.open(function (err, gridStore) {
        if (!err) {
            _self._opened = true;
            _self._writeDirect(chunk, encoding, callback);
        }
        else {
            callback(err);
        }
    });;
};

GridFSWriteStream.prototype._writeDirect = function (chunk, encoding, callback) {
    this._gridStore.write(chunk, function (err, gridStore) {
        callback(err);
    });
};

module.exports.GridFSWriteStream = GridFSWriteStream;