/*
 * Router - For the REST Server
 *
 * Created by Julian Jewel
 */
// MongoDB Include
var app = module.parent.exports.app;
var config = module.parent.exports.config;
// Logging
var logger = module.parent.exports.logger;
// Export config, so that it can be used anywhere
module.exports.config = config;
// Needed for GridFS Multipart
var multipart = require('connect-multipart-gridform');
var util = require('util');
var dom = require('xmldom').DOMParser;
var jsonpath = require("JSONPath").eval;
var S = require('string');
var mongo = require('mongodb');
var mongoUtil = require('vcommons').mongoUtil;
// Initialize ObjTree library for XML/JSON Conversion
UTIL = {};
UTIL.XML = require('vcommons').objTree;
// Globally available for conversion
var xotree = new UTIL.XML.ObjTree();
var _ = require('underscore');
var EventEmitter = require("events").EventEmitter;
var uuid = require('node-uuid');
var dataTransform = require('./dataTransform.js')(null);
var GridFSWriteStream = require('./GridFSWriteStream').GridFSWriteStream;

var Router = function(options, callback) {
    var _self = this;
    if (!_.isUndefined(options)) {
        if (!_.isUndefined(options.db) && !_.isUndefined(options.mongo)) {
            this.db = options.db;
            this.mongo = options.mongo;
        } else if (!_.isUndefined(options.url)) {
            _connectToMongoDB(this, options, function(err, db) {
                if (err) {
                    throw err;
                }
                else {
                    callback(_self);
                }
            });
        } else {
            throw new Error('Router options must contain a url property or db and mongo properties.');
        }

        if (!_.isUndefined(options.limit)) {
            this.limit = options.limit;
        } else {
            this.limit = 100;
        }

        if (!_.isUndefined(options.highWaterMark)) {
            this.highWaterMark = options.highWaterMark;
        }
        else {
            this.highWaterMark = 16 * 1024;
        }
    } else {
        throw new Error("Router requires options.");
    }
}

Router.DEFAULT_RECONNECT_RETRY_INTERVAL_MS = 1000;

function _connectToMongoDB(router, options, callback) {
    mongo.MongoClient.connect(options.url, options.options, function(err, db) {
        if (err) {
            callback(err);
        }
        else if (options.autoReconnect && db.serverConfig.isAutoReconnect()) {
            callback(new Error('Cannot have both autoReconnect and serverConfig.auto_reconnect enabled at the same time.'));
        }
        else {
            logger.info('Connection to database established.');
            router.db = db;
            router.mongo = mongo;
            callback(null, db);
            db.on('timeout', function(err) {
                logger.warn('Connection to database timed out.');
                if (config.db.autoReconnect === true) {
                    _attemptReconnect(router, options);
                }
                else if (!db.serverConfig.isAutoReconnect()) {
                    throw new Error('Connection to database timed out and autoReconnect is not enabled.');
                }
            });
            db.on('close', function(err) {
                logger.warn('Connection to database was closed');
                if (config.db.autoReconnect === true) {
                    setTimeout(function() {
                        _attemptReconnect(router, options)
                    }, _getReconnectRetryIntervalMS());
                }
                else if (!db.serverConfig.isAutoReconnect()) {
                    throw new Error('Connection to database was closed and autoReconnect is not enabled.');
                }
            });
        }
    });
}

function _getReconnectRetryIntervalMS() {
    if (_.isNumber(config.db.reconnectRetryIntervalMS)) {
        return config.db.reconnectRetryIntervalMS;
    }
    else {
        return Router.DEFAULT_RECONNECT_RETRY_INTERVAL_MS;
    }
}

function _attemptReconnect(router, options) {
    logger.debug('Attempting database reconnect.');
    _connectToMongoDB(router, options, function(err, db) {
        if (err) {
            setTimeout(function() {
                _attemptReconnect(router, options);
            }, _getReconnectRetryIntervalMS());
        }
    });
}

util.inherits(Router, EventEmitter);

Router.prototype.getFiles = function(req, res, next) {
    req.locals = {};
    this.db.collection('fs.files', function(err, collection) {
        if (err)
            return next(err);
        collection.find({}, function(err, cursor) {
            if (err)
                return next(err);
            cursor.sort({
                uploadDate: -1
            }).limit(this.limit);
            cursor.toArray(function(err, items) {
                if (err)
                    return next(err);
                res.locals.items = JSON.stringify(items);
                return next();
            });
        });
    });
};

Router.prototype.downloadFile = function(req, res, next) {
    var store = new this.mongo.GridStore(this.db, this.createID(req.params.id), '', 'r');
    store.open(function(err, gs) {
        if (err) {
            logger.warn("Error getting file", err);
            res.send(404);
        } else {
            res.writeHead(200, "OK", {
                'Content-Disposition': 'attachment; filename=' + gs.filename,
                'Content-Length': gs.length,
                'Content-Type': gs.contentType
            });
            var stream = gs.stream();
            stream.pipe(res);
        }
    });
};

Router.prototype.uploadFile = function(req, res, next) {
    var _self = this;
    res.locals.uploading = ['t'];
    res.locals.files = {};
    req.form.on('part', function(part) {
        var options = {
            db: _self.db,
            mongo: _self.mongo,
            filename: part.filename,
            content_type: part.headers['content-type'],
            mode: 'w',
            root: 'fs',
            highWaterMark: _self.highWaterMark
        };

        var ws = new GridFSWriteStream(options);

        ws.once('finish', function() {
            var mountPoint = (_.isUndefined(config.context) ? '' : config.context) + '/' + config.db.name;
            var path = mountPoint + '/fs/' + ws.id;
            var file = {
                type: part.headers['content-type'],
                id: ws.id,
                size: ws._gridStore.position,
                root: ws._gridStore.root,
                path: part.filename,
                lastModified: ws.file.uploadDate
            };
            res.locals.files[part.name] = file;
            res.locals.uploading.pop();
            if (res.locals.uploading.length === 0) {
                next();
            }
        });

        ws.once('error', function () {
            logger.warn('There was an error writing to database.');
            res.locals.statusCode = 500;
            res.locals.items = {text: 'Error writing to database.'};
            res.locals.uploading.pop();
            flushStream(part);
            if (res.locals.uploading.length === 0) {
                next();
            }
        });

        res.locals.uploading.push('t');
        part.pipe(ws);
    });
    req.form.on('close', function() {
        res.locals.uploading.pop();
        if (res.locals.uploading.length === 0) {
            next();
        }
    });
};

Router.prototype.removeFile = function(req, res, next) {
    var _self = this;
    var fileID = _self.createID(req.params.id);
    _self.db.collection('fs.files', function(err, collection) {
        if (err)
            return next(err);
        collection.remove({
            _id: fileID
        }, function(err) {
            if (err)
                return next(err);
            _self.db.collection('fs.chunks', function(err, collection) {
                if (err)
                    return next(err);
                collection.remove({
                    files_id: fileID
                }, function(err) {
                    if (err)
                        return next(err);
                    res.locals.id = req.params.id;
                    res.locals.items = JSON.parse('{ "success": true }');
                    return next();
                });
            });
        });
    });
};

Router.prototype.getCollection = function(req, res, next) {
    var _self = this;
    var query = req.query.query ? JSON.parse(req.query.query, Router.jsonQueryReviver) : {};
    // Providing an id overwrites giving a query in the URL
    if (req.params.id) {
        query = {
            _id: _self.createID(req.params.id)
        };
    }
    var options = req.params.options || {};

    if (_.isUndefined(options.limit)) {
        options.limit = this.limit;
    }

    var test = ['limit', 'sort', 'fields', 'skip', 'hint', 'explain', 'snapshot', 'timeout'];

    for (o in req.query) {
        if (test.indexOf(o) >= 0) {
            options[o] = JSON.parse(req.query[o]);
        }
    }
    this.db.collection(req.params.collection, function(err, collection) {
        if (err)
            return next(err);
        collection.find(query, options, function(err, cursor) {
            if (err)
                return next(err);
            cursor.toArray(function(err, docs) {
                if (err)
                    return next(err);
                docs = docs ? docs : {};
                var result = [];
                if (req.params.id) {
                    if (docs.length > 0) {
                        result = docs[0];
                        if (req.query.jpath && docs.length == 1) {
                            result = jsonpath(result, JSON.parse(req.query.jpath));
                        }
                    } else {
                        return next();
                    }
                } else {
                    for (var i = 0; i < docs.length; i++) {
                        result.push(docs[i]);
                    }
                }
                res.locals.items = result;
                _self.emit('r', req, res);
                return next();
            });
        });
    });
};

Router.prototype.postToCollection = function(req, res, next) {
    var _self = this;
    if (req.body) {
        var json = JSON.stringify(req.body);
        logger.trace('body=' + json);
        var toInsert = JSON.parse(json, dataTransform.bodyParseJsonReviver);
        // We only support inserting one document at a time.
        if (Array.isArray(toInsert)) {
            toInsert = toInsert[0];
        }
        toInsert.uploadDate = new Date();
        if (!_.isUndefined(toInsert._id)) {
            toInsert._id = _self.createID(toInsert._id);
        }
        this.db.collection(req.params.collection, function(err, collection) {
            if (err)
                throw err;
            collection.insert(toInsert, function(err, docs) {
                if (err)
                    return next(err);
                res.locals.id = docs[0]._id.toString();
                var mountPoint = (_.isUndefined(config.context) ? '' : config.context) + '/' + config.db.name;
                var path = mountPoint + '/' + req.params.collection + '/' + res.locals.id;
                var doc = {
                    document: {
                        id: docs[0]._id,
                        path: path,
                        uploadDate: toInsert.uploadDate
                    }
                };
                res.locals.items = doc;
                res.locals.docs = docs;
                _self.emit("i", req, res);
                return next();
            });
        });
    } else {
        throw new Error("Empty body received");
    }
};

Router.prototype.putToCollection = function(req, res, next) {
    var _self = this;
    var spec = {
        _id: _self.createID(req.params.id)
    };

    var toInsert = req.body;
    toInsert.uploadDate = new Date();

    if (toInsert._id) {
        if (toInsert._id == req.params.id)
            delete toInsert._id;
        else
            throw new Error("Trying to update a document with id " + req.params.id
                    + " when the original document id is " + toInsert._id);
    }

    this.db.collection(req.params.collection, function(err, collection) {
        collection.update(spec, toInsert, true, function(err, docs) {
            if (err)
                return next(err);
            res.locals.id = spec._id;
            var mountPoint = (_.isUndefined(config.context) ? '' : config.context) + '/' + config.db.name;
            var path = mountPoint + '/' + req.params.collection + '/' + res.locals.id;
            var doc = {
                document: {
                    id: spec._id,
                    path: path,
                    uploadDate: toInsert.uploadDate
                }
            };
            res.locals.items = doc;
            toInsert._id = spec._id;
            res.locals.docs = toInsert;
            _self.emit("u", req, res);
            return next();
        });
    });
};

Router.prototype.deleteFromCollection = function(req, res, next) {
    var _self = this;
    var spec = {
        _id: _self.createID(req.params.id)
    };
    this.db.collection(req.params.collection, function(err, collection) {
        if (err)
            return next(err);
        collection.remove(spec, function(err, docs) {
            res.locals.id = req.params.id;
            res.locals.items = JSON.parse('{ "success": true }');
            res.locals.docs = docs;
            _self.emit("d", req, res);
            return next();
        });
    });
};

Router.prototype.bulkDeleteFromCollection = function(req, res, next) {
    var _self = this;
    var query = req.query.query ? JSON.parse(req.query.query) : {};
    this.db.collection(req.params.collection, function(err, collection) {
        if (err)
            return next(err);
        collection.remove(query, function(err, docs) {
            res.locals.items = JSON.parse('{ "success": true }');
            res.locals.docs = docs;
            _self.emit("d", req, res);
            return next();
        });
    });
};

Router.prototype.searchText = function(req, res, next) {
    var query = req.query.text ? JSON.parse(req.query.text) : {};
    var limit = req.query.limit ? JSON.parse(req.query.limit) : {};
    var filter = req.query.filter ? JSON.parse(req.query.filter) : {};
    var project = req.query.project ? JSON.parse(req.query.project) : {};

    this.db.command({
        text: req.params.collection,
        search: query,
        limit: limit,
        filter: filter,
        project: project
    }, function(err, results) {
        if (err)
            return next(err);
        results = (results && results.results) ? results.results : [];
        res.locals.items = JSON.stringify(results);
        return next();
    });
};

// Resumes read stream that was interrupted during processing so that the client that's
// pushing the data to us doesn't get hung.  An empty on('data') implementation is used so
// that the unused bytes don't get stuck in the readstream's buffer.
function flushStream(stream) {
    stream.on('data', function (chunk) {
    });
    stream.resume();
}

Router.prototype.transformToCollection = function(req, res, next) {
    var _self = this;
    req.form.on('part', function (part) {
        if (!res.locals.statusCode) {
            if (part.name === 'file') {
                var transformAdapter = config.transform.adapters[part.headers['content-type']];
                if (!_.isUndefined(transformAdapter)) {
                    var options = config.transform[transformAdapter.options];
                    var xmlSchemeHeader = 'Content-Desc';
                    var contentDesc = req.header(xmlSchemeHeader);
                    if (_.isUndefined(contentDesc) || !_.isUndefined(options[contentDesc])) {
                        options.db = _self.db;
                        options.mongo = _self.mongo;
                        part.collection = req.params.collection;
                        part.headers['content-desc'] = req.header['Content-Desc'];
                        require(transformAdapter.module)(options).transform(part, function (err, docs) {
                            if (err) {
                                res.locals.statusCode = 400;
                                res.locals.items = {Error: '400 - ' + err.text};
                                process.nextTick(function () {
                                    flushStream(part);
                                    next();
                                });
                            } else {
                                res.locals.items = docs;
                                res.locals.docs = docs;
                                _self.emit("i", req, res);
                                next();
                            }
                        });
                    } else {
                        res.locals.statusCode = 415;
                        res.locals.items = {Error: '415 - ' + xmlSchemeHeader + ': ' + contentDesc + ' is not supported'};
                        flushStream(part);
                        next();
                    }
                } else {
                    res.locals.statusCode = 415;
                    res.locals.items = {Error: '415 - Content Type: ' + part.headers["content-type"] + ' is not supported'};
                    flushStream(part);
                    next();
                }
            }
            else {
                res.locals.statusCode = 400;
                res.locals.items = {Error: '400 - name="file" is required'};
                flushStream(part);
                next();
            }
        }
        else {
            flushStream(part);
        }
    });
};

Router.prototype.sendResponse = function(req, res, next) {
    if (!res.locals.items) {
        res.locals.statusCode = 404;
        res.locals.items = {Error: 'File not found'};
    } else if (_.isUndefined(res.locals.statusCode)) {
        res.locals.statusCode = 200;
    }

    if (req.accepts('json')) {
        res.header('Content-Type', 'application/json');
        res.send(res.locals.statusCode, res.locals.items);
    } else if (req.accepts('xml')) {
        res.header('Content-Type', 'application/xml');
        var xotree_xml;
        res.locals.items = mongoUtil.beautify(res.locals.items);
        if (!Array.isArray(res.locals.items)) {
            xotree_xml = dataTransform.jsonToXML({
                "document": res.locals.items
            });
        } else {
            xotree_xml = dataTransform.jsonToXML({
                "documents": {
                    "document": res.locals.items
                }
            });
        }
        res.send(res.locals.statusCode, xotree_xml);
    } else {
        throw new Error("Does not Accept: application/xml or application/json");
    }
};

Router.prototype.sendCreatedResponse = function(req, res, next) {
    if (!_.isUndefined(res.locals.files) && _.isUndefined(res.locals.items)) {
        res.locals.items = res.locals.files;
    }

    if (_.isUndefined(res.locals.items)) {
        res.locals.statusCode = 404;
        res.locals.items = {Error: 'File not found'};
    } else if (_.isUndefined(res.locals.statusCode)) {
        var mountPoint = (_.isUndefined(config.context) ? '' : config.context) + '/' + config.db.name;
        res.header('Location', mountPoint + '/' + req.params.collection + '/' + res.locals.id);
        res.locals.statusCode = 201;
    }

    if (req.accepts('json')) {
        res.header('Content-Type', 'application/json');
        res.send(res.locals.statusCode, res.locals.items);
    } else if (req.accepts('xml')) {
        res.header('Content-Type', 'application/xml');
        var docObj = dataTransform.insertedResponseFieldsToString(res.locals.items);
        var xotree_xml = dataTransform.jsonToXML(docObj);
        res.send(res.locals.statusCode, xotree_xml);
    } else {
        throw new Error("Does not Accept: application/xml or application/json");
    }
};

Router.prototype.emitAsyncResponse = function(doc, channel, batchId, err, isReqXml, jPath, req, res) {
    var _self = this;
    logger.trace('Recieved payload to emit without batch', ' Channel:', channel, ' XML Response?', isReqXml,
            ' Batch ID:', batchId, 'JPath', jPath, ' Error:', err);
    _self.emitAsyncResponseBatch(doc, channel, batchId, 0, true, 0, err, isReqXml, false, jPath, req, res);
};

Router.prototype.emitAsyncResponseBatch = function(doc, channel, batchId, batchSequence, batchEnd, batchCount, err, isReqXml, batchDetails, jPath, req, res) {
    var _self = this;
    var doc = doc ? doc : {};
    logger.trace('Recieved payload to emit async. response', doc, ' Channel:', channel, ' XML Response?', isReqXml,
            ' Batch ID:', batchId, ' JPath', jPath, ' Batch Detail', batchDetails, ' Error:', err);
    if (jPath) {
        doc = jsonpath(doc, jPath);
        logger.trace('Converted payload with JPath', jPath, ' Document:', doc);
    }
    // Send document as_is
    if (batchDetails) {
        doc.channel = channel;
        doc.batchWorkUnitId = batchId;
        doc.batchWorkUnitSequence = batchSequence;
        doc.batchWorkUnitEnd = batchEnd;
        doc.batchWorkUnitCount = batchCount;
    }
    if (err) {
        doc.error = err;
    }
    var result = doc;
    if (!_.isEmpty(result)) {
        if (isReqXml) {
            result = mongoUtil.beautify(result);
            logger.trace('Beautified document', result);
            result = dataTransform.jsonToXML(result);
            logger.trace('Writing XML Document', result);
        } else {
            result = JSON.stringify(result);
        }
        logger.info('Emitting Result', result);
        _self.emit("g", req, res, result)
    }
};

Router.prototype.asyncResponse = function(req, res, next) {
    var _self = this;

    if (_.isUndefined(req.params.channel)) {
        res.send(new Error('Channel has to be specified db/collection/async/channelName'), 404);
        return;
    }

    var query = req.query.query ? JSON.parse(req.query.query) : {};
    var batchId = req.query.batchId ? req.query.batchId : uuid.v1();
    var batchDetail = req.query.batchDetail ? req.query.batchDetail : false;
    var jPath = req.query.jpath ? JSON.parse(req.query.jpath) : null;

    // Providing an id overwrites giving a query in the URL
    if (req.params.id) {
        query = {
            '_id': new this.mongo.BSONPure.ObjectID(req.params.id)
        };
    }
    var options = req.params.options || {};

    var test = ['limit', 'sort', 'fields', 'skip', 'hint', 'explain', 'snapshot', 'timeout'];

    for (o in req.query) {
        if (test.indexOf(o) >= 0) {
            options[o] = JSON.parse(req.query[o]);
        }
    }
    this.db.collection(req.params.collection, function(err, collection) {
        if (err) {
            logger.error('DB Error when accessing ', req.params.collection);
            _self.emitAsyncResponse(doc, req.params.channel, batchId, err, req.accepts('xml'), jPath, req, res);
            return;
        }
// Do a find and get the cursor count
        if (batchDetail) {
            collection.find(query, options).count(
                    function(err, count) {
                        if (err) {
                            logger.error('DB Error when running the query ', query, options);
                            _self.emitAsyncResponseBatch(doc, req.params.channel, batchId, 0, true, count, err, req
                                    .accepts('xml'), batchDetail, jPath, req, res);
                            return;
                        }
                        collection.find(query, options, function(err, cursor) {
                            if (err) {
                                logger.error('DB Error when running the query ', query, options);
                                _self.emitAsyncResponseBatch(doc, req.params.channel, batchId, 0, true, count, err, req
                                        .accepts('xml'), batchDetail, jPath, req, res);
                                return;
                            }
                            var i = 0;
                            cursor.each(function(err, doc) {
                                i++;
                                if (err) {
                                    logger.error("Received error when processing async response", err);
                                    _self.emitAsyncResponseBatch(doc, req.params.channel, batchId, i, (i == count),
                                            count, err, req.accepts('xml'), batchDetail, jPath, req, res);
                                    return;
                                }
                                if (doc) {
                                    logger.trace("Result document from DB", doc);
                                    _self.emitAsyncResponseBatch(doc, req.params.channel, batchId, i, (i == count),
                                            count, err, req.accepts('xml'), batchDetail, jPath, req, res);
                                }
                            });
                            return;
                        });
                    });
        } else {
            collection.find(query, options,
                    function(err, cursor) {
                        if (err) {
                            logger.error('DB Error when running the query ', query, options);
                            _self.emitAsyncResponse(doc, req.params.channel, batchId, err, req.accepts('xml'), jPath,
                                    req, res);
                            return;
                        }
                        cursor.each(function(err, doc) {
                            if (err) {
                                logger.error("Received error when processing async response", err);
                                _self.emitAsyncResponse(doc, req.params.channel, batchId, err, req.accepts('xml'),
                                        jPath, req, res);
                                return;
                            }
                            if (doc) {
                                logger.trace("Result document from DB", doc);
                                _self.emitAsyncResponse(doc, req.params.channel, batchId, err, req.accepts('xml'),
                                        jPath, req, res);
                            }
                        });
                        return;
                    });
        }
    });
    res.send(batchId, 200);
};

Router.prototype.createID = function(value) {
    var ret = null;
    if (typeof (value) == 'string') {
        try {
            ret = new this.mongo.ObjectID(value);
        } catch (e) {
            ret = value;
        }
    } else {
        throw new Error('Only IDs of type string are supported at this time.');
    }
    return ret;
};

Router.jsonQueryReviver = function(key, value) {
    var ret = value;
    if (typeof (value) === 'string') {
        var a = /ISODate\((\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?)\)/.exec(value);
        if (a) {
            ret = new Date(a[1]);
        }
    }
    ret = dataTransform.bodyParseJsonReviver(key, value);
    return ret;
};

module.exports = Router;
