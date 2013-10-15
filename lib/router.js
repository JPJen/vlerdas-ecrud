/*
* Router - For the REST Server
*
* Created by Julian Jewel
*/
// MongoDB Include
var app = module.parent.exports.app;
var config = module.parent.exports.config;
// Export config, so that it can be used anywhere
module.exports.config = config;
// Needed for GridFS Multipart
var multipart = require('connect-multipart-gridform'),
_ = require('underscore');
var PFParser = require("pdf2json");
var dom = require('xmldom').DOMParser;
var querystring = require("querystring");
var jsonpath = require("JSONPath").eval;
var S = require('string');
var fs = require('fs');
var nodecr = require('nodecr');
var csvjs = require('csv-json');
var select = require('xpath.js');
var util = require('../node_modules/vcommons/mongo/util.js');
// Initialize ObjTree library for XML/JSON Conversion
UTIL = {};
UTIL.XML = require('../node_modules/vcommons/xml/js-ObjTree');
// Globally available for conversion
var xotree = new UTIL.XML.ObjTree();
var events = require("events");
// Event handling
var event = new events.EventEmitter();

if (config.notification.eventHandler.enabled) {
	var eventHandler = require(config.notification.eventHandler.file)();
	event.on("i", eventHandler.onInsert);
	event.on("u", eventHandler.onUpdate);
	event.on("d", eventHandler.onDelete);
}

if (config.async.eventHandler.enabled) {
	var asyncEvents = new events.EventEmitter();
	var asyncEventHandler = require(config.async.eventHandler.file)();
	event.on("g", asyncEventHandler.onGet);
}


module.exports = exports = function (db, mongo, tempPath) {
    return {
        getFiles: function (req, res, next) {
            req.locals = {};
            db.collection('fs.files', function (err, collection) {
                if (err) return next(err);
                collection.find({}, function (err, cursor) {
                    if (err) return next(err);
                    cursor.sort({
                        uploadDate: -1
                    }).limit(100);
                    cursor.toArray(function (err, items) {
                        if (err) return next(err);
                        res.locals.items = util.beautify(items);
						return next();
                    });
                });
            });
        },
        downloadFile: function (req, res, next) {
            var readstream = multipart.gridform.gridfsStream(db, mongo).createReadStream(req.param('id'));
            readstream.on('open', function () {
                var store = readstream._store;
                res.setHeader('Content-disposition', 'attachment; filename=' + store.filename);
	            readstream.pipe(res);
            });
            readstream.on('error', function (err) {
				console.log("Error getting file", err);
				res.send(404);
			});
        },
        removeFile: function (req, res, next) {
            db.collection('fs.files', function (err, collection) {
                if (err) return next(err);
                collection.remove({
                    _id: mongo.ObjectID(req.param('id'))
                }, function (err) {
                    if (err) return next(err);
                    db.collection('fs.chunks', function (err, collection) {
                        if (err) return next(err);
                        collection.remove({files_id: mongo.ObjectID(req.param('id'))}, function (err) {
							if (err) return next(err);
							res.locals.id = req.params.id;
							res.locals.items=JSON.parse('{ "success": true }');
                        	return next();
						});
                    });
                });
            });
        },
        getCollection: function (req, res, next) {
            var query = req.query.query ? JSON.parse(req.query.query) : {};
            // Providing an id overwrites giving a query in the URL
            if (req.params.id) {
                query = {
                    '_id': new mongo.BSONPure.ObjectID(req.params.id)
                };
            }
            var options = req.params.options || {};

            var test = ['limit', 'sort', 'fields', 'skip', 'hint', 'explain', 'snapshot', 'timeout'];

            for (o in req.query) {
                if (test.indexOf(o) >= 0) {
                    options[o] = JSON.parse(req.query[o]);
                }
            }
            db.collection(req.params.collection, function (err, collection) {
                if (err) return next(err);
                collection.find(query, options, function (err, cursor) {
                    if (err) return next(err);
                    cursor.toArray(function (err, docs) {
                        if (err) return next(err);
                        docs = docs ? docs : {};
                        var result = [];
                        if (req.params.id) {
                            if (docs.length > 0) {
                                result = util.beautify(docs[0]);
                                if (req.query.jpath && docs.length == 1) {
                                    result = jsonpath(result, JSON.parse(req.query.jpath));
                                }
                            } else {
                                return next();
                            }
                        } else {
							for (var i=0; i<docs.length; i++) {
								result.push(util.beautify(docs[i]));
							}
                        }
						res.locals.items = result;
						return next();
                    });

                });
            });
        },
        postToCollection: function (req, res, next) {
            if (req.body) {
				toInsert = req.body;
				toInsert.uploadDate = new Date();
                db.collection(req.params.collection, function (err, collection) {
                    if (err) throw err;
                    // We only support inserting one document at a time
                    collection.insert(Array.isArray(toInsert) ? toInsert[0] : toInsert, function (err, docs) {
                        if (err) return next(err);
						res.locals.id=docs[0]._id.toHexString();
						res.locals.items=JSON.parse('{ "success": true }');
						if(config.notification.eventHandler.enabled)
							event.emit("i", config.notification.eventHandler.channel, req.params.collection, docs);
						return next();
                    });
                });
            } else {
				throw new Error("Empty body received");
            }
        },
        putToCollection: function (req, res, next) {
            var spec = {
                '_id': new mongo.BSONPure.ObjectID(req.params.id)
            };

            var toInsert = req.body;
			toInsert.uploadDate = new Date();

            db.collection(req.params.collection, function (err, collection) {
                collection.update(spec, toInsert, true, function (err, docs) {
					if(err) return next(err);
					res.locals.id = req.params.id;
					res.locals.items=JSON.parse('{ "success": true }');
					if(config.notification.eventHandler.enabled)
						event.emit("u", config.notification.eventHandler.channel, req.params.collection, docs);
					return next();
                });
            });
        },
        deleteFromCollection: function (req, res, next) {
            var spec = {
                '_id': new mongo.BSONPure.ObjectID(req.params.id)
            };
            db.collection(req.params.collection, function (err, collection) {
				if(err) return next(err);
                collection.remove(spec, function (err, docs) {
					res.locals.id = req.params.id;
					res.locals.items=JSON.parse('{ "success": true }');
					if(config.notification.eventHandler.enabled)
						event.emit("d", config.notification.eventHandler.channel, req.params.collection, docs);
					return next();
                });
            });
        },
		searchText: function(req, res, next) {
			var query = req.query.text ? JSON.parse(req.query.text) : {};
			var limit = req.query.limit ? JSON.parse(req.query.limit) : {};
			var filter = req.query.filter ? JSON.parse(req.query.filter) : {};
			var project = req.query.project ? JSON.parse(req.query.project) : {};

			db.command({text:req.params.collection, search:query, limit:limit, filter:filter, project:project}, function(err,results){
				if(err) return next(err);
				results = (results && results.results) ? results.results : [];
				res.locals.items=util.beautify(results);
				return next();
			});
		},
        transformToCollection: function (req, res, next) {
			var readstream = multipart.gridform.gridfsStream(db, mongo).createReadStream(req.files.file.id);

            function createCollection(json) {
                db.collection(req.params.collection, function (err, collection) {
                    if(err) return next(err);
                    if(!_.isUndefined(json)) {
                        json.uploadDate = new Date();
                        collection.insert(json, function (err, docs) {
                            if(err) return next(err);
                            res.locals.items = docs;
                            if(config.notification.eventHandler.enabled)
                                event.emit("i", config.notification.eventHandler.channel, req.params.collection, docs);
                            return next();
                        });
                    }
                });
            }


			readstream.on('open', function () {
                var store = readstream._store;
				var newPath = tempPath + '/' + req.files.file.id + '_' + store.filename;
				console.log(newPath);
				// Stage file
				var writestream = fs.createWriteStream(newPath);
				readstream.pipe(writestream);
				// Recognise text of any language in any format
				var contentType = req.files.file.type;

				if (S(contentType).startsWith('application/pdf') || S(contentType).startsWith('application/x-msdownload')) {
					var _onPFBinDataReady = function (evtData) {
						var textData = evtData.data;
						db.collection(req.params.collection, function (err, collection) {
							// Extract Text portion and save it in a separate node
							var data = jsonpath(JSON.parse(JSON.stringify(textData)), "$..T");
							var aggregateData = '';
							for (var i = 0; i < data.length; i++) {
								aggregateData += data[i];
							}
							aggregateData = querystring.unescape(aggregateData);
							textData.text = aggregateData;
							textData.uploadDate = new Date();

							collection.insert(Array.isArray(textData) ? textData[0] : textData, function (err, docs) {
								if (err) return next(err);
								res.locals.items = textData;
								evtData.destroy();
								evtData = null;
								if(config.notification.eventHandler.enabled)
									event.emit("i", config.notification.eventHandler.channel, req.params.collection, docs);
								return next();
							});
						});
					};

					var _onPFBinDataError = function (evtData) {
						evtData.destroy();
						evtData = null;
						return next();
					};

					var pdfParser = new PFParser();
					pdfParser.on("pdfParser_dataReady", _.bind(_onPFBinDataReady, {}));
					pdfParser.on("pdfParser_dataError", _.bind(_onPFBinDataError, {}));
					pdfParser.loadPDF(newPath);
				} else if (S(contentType).startsWith('image')) {
					nodecr.process(newPath, function (err, text) {
						if (err) {
							throw err;
						} else {
							var toInsert = {
								// TODO: Remove hardcoding
								"text": text
							};
							toInsert.uploadDate = new Date();

							db.collection(req.params.collection, function (err, collection) {
								collection.insert(Array.isArray(toInsert) ? toInsert[0] : toInsert, function (err, docs) {
									res.locals.id = docs[0]._id.toHexString();
									res.locals.items = toInsert;
									if(config.notification.eventHandler.enabled)
										event.emit("i", config.notification.eventHandler.channel, req.params.collection, docs);
									return next();
								});
							});
						}
					});
				} else if (S(contentType).startsWith('application/vnd.ms-excel')) {
					csvjs.parseCsv(newPath, {
							options: { //Options:
								delimiter: ','
							}
						},
						function (err, json, stats) {
							if(err) return next(err);
							db.collection(req.params.collection, function (err, collection) {
								if(err) return next(err);
								if(!_.isUndefined(json)) {
									json.uploadDate = new Date();
									collection.insert(json, function (err, docs) {
										res.locals.items = docs;
										if(config.notification.eventHandler.enabled)
											event.emit("i", config.notification.eventHandler.channel, req.params.collection, docs);
										return next();
									});
								}
							});
						}
					);
				} else if (S(store.filename).endsWith('json')) {
					fs.readFile(newPath, function (err,data) {
						if (err) return next(err);
						var json = JSON.parse(data);
						// Documents is the delimiter
						var json = json.documents;
						createCollection(json);
					});
				} else if (S(store.filename).endsWith('xml')) {

					require("./transformXML.js")().transform(req.files.file.id, readstream, createCollection);

				} else {
					throw new Error('{"error": "404 - Content Type:' + contentType + ' is not supported"}');
					//TODO: do we want to error here or just log and return?
					console.log("!!Content type is unkown. Cannot transform!!");
                    return next();

				}
			});
        },
		sendResponse: function(req, res, next) {
			if(!res.locals.items) {
				res.send(404);
				return;
			}
			if(req.accepts('json')) {
				res.header('Content-Type', 'application/json');
				res.send(res.locals.items, 200);
			}
			else if(req.accepts('xml')) {
				res.header('Content-Type', 'application/xml');
				var xotree_xml;
				if (!Array.isArray(res.locals.items)) {
					xotree_xml = xotree.writeXML({"document" : res.locals.items});
				}
				else {
					xotree_xml = xotree.writeXML({"documents" : {"document" : res.locals.items}});
			    }
				res.send(xotree_xml, 200);
			} else {
				throw new Error("Does not Accept: application/xml or application/json");
			}
		},
		sendCreatedResponse: function (req, res, next) {
			if(!_.isUndefined(req.files) && _.isUndefined(res.locals.items)) {
				res.locals.items = req.files;
			}
			if(_.isUndefined(res.locals.items)) {
				res.send(404);
				return;
			}
			res.header('Location', '/' + req.params.db + '/' + req.params.collection + '/' + res.locals.id);
			if(req.accepts('json')) {
				res.header('Content-Type', 'application/json');
				res.send(res.locals.items, 201);
			}
			else if(req.accepts('xml')) {
				res.header('Content-Type', 'application/xml');
				var xotree_xml = xotree.writeXML(util.beautify(res.locals.items));
				res.send(xotree_xml, 201);
			} else {
				throw new Error("Does not Accept: application/xml or application/json");
			}
		},
		asyncResponse: function(req, res, next) {
            var query = req.query.query ? JSON.parse(req.query.query) : {};
            // Providing an id overwrites giving a query in the URL
            if (req.params.id) {
                query = {
                    '_id': new mongo.BSONPure.ObjectID(req.params.id)
                };
            }
            var options = req.params.options || {};

            var test = ['limit', 'sort', 'fields', 'skip', 'hint', 'explain', 'snapshot', 'timeout'];

            for (o in req.query) {
                if (test.indexOf(o) >= 0) {
                    options[o] = JSON.parse(req.query[o]);
                }
            }
            db.collection(req.params.collection, function (err, collection) {
                if (err) return next(err);
                collection.find(query, options, function (err, cursor) {
                    if (err) return next(err);
                    cursor.each(function (err, doc) {
                        // TODO: Handle error - For now Stop
						if (err) return;
						if(!_.isUndefined(doc) && !_.isEmpty(doc)) {
							var id = util.beautify(doc);
							// Send document as_is
							if(req.accepts('xml')) {
								result = xotree.writeXML(doc);
							}
							event.emit("g", req.params.channel, result);
						}
                    });
					return;

                });
            });
			res.send(200);
		}
   };
};