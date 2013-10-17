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
var multipart = require('connect-multipart-gridform');
var util = require('util');
var dom = require('xmldom').DOMParser;
var jsonpath = require("JSONPath").eval;
var S = require('string');
var mongoUtil = require('vcommons').mongoUtil;
// Initialize ObjTree library for XML/JSON Conversion
UTIL = {};
UTIL.XML = require('vcommons').objTree;

// Globally available for conversion
var xotree = new UTIL.XML.ObjTree();
var EventEmitter = require("events").EventEmitter;

var Router = function (db, mongo) {
	this.db = db;
	this.mongo = mongo;
}

util.inherits(Router, EventEmitter);

Router.prototype.getFiles = function (req, res, next) {
	req.locals = {};
	this.db.collection('fs.files', function (err, collection) {
		if (err) return next(err);
		collection.find({}, function (err, cursor) {
			if (err) return next(err);
			cursor.sort({
				uploadDate: -1
			}).limit(100);
			cursor.toArray(function (err, items) {
				if (err) return next(err);
				res.locals.items = mongoUtil.beautify(items);
				return next();
			});
		});
	});
};

Router.prototype.downloadFile = function (req, res, next) {
	var readstream = multipart.gridform.gridfsStream(this.db, this.mongo).createReadStream(req.param('id'));
	readstream.on('open', function () {
		var store = readstream._store;
		res.setHeader('Content-disposition', 'attachment; filename=' + store.filename);
		readstream.pipe(res);
	});
	readstream.on('error', function (err) {
		console.log("Error getting file", err);
		res.send(404);
	});
};

Router.prototype.removeFile = function (req, res, next) {
	var _self = this;
	_self.db.collection('fs.files', function (err, collection) {
		if (err) return next(err);
		collection.remove({
			_id: _self.mongo.ObjectID(req.param('id'))
		}, function (err) {
			if (err) return next(err);
			_self.db.collection('fs.chunks', function (err, collection) {
				if (err) return next(err);
				collection.remove({files_id: _self.mongo.ObjectID(req.param('id'))}, function (err) {
					if (err) return next(err);
					res.locals.id = req.params.id;
					res.locals.items=JSON.parse('{ "success": true }');
					return next();
				});
			});
		});
	});
};

Router.prototype.getCollection = function (req, res, next) {
	var query = req.query.query ? JSON.parse(req.query.query) : {};
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
	this.db.collection(req.params.collection, function (err, collection) {
		if (err) return next(err);
		collection.find(query, options, function (err, cursor) {
			if (err) return next(err);
			cursor.toArray(function (err, docs) {
				if (err) return next(err);
				docs = docs ? docs : {};
				var result = [];
				if (req.params.id) {
					if (docs.length > 0) {
						result = mongoUtil.beautify(docs[0]);
						if (req.query.jpath && docs.length == 1) {
							result = jsonpath(result, JSON.parse(req.query.jpath));
						}
					} else {
						return next();
					}
				} else {
					for (var i=0; i<docs.length; i++) {
						result.push(mongoUtil.beautify(docs[i]));
					}
				}
				res.locals.items = result;
				return next();
			});

		});
	});
};

Router.prototype.postToCollection = function (req, res, next) {
	var _self = this;
	if (req.body) {
		toInsert = req.body;
		toInsert.uploadDate = new Date();
		this.db.collection(req.params.collection, function (err, collection) {
			if (err) throw err;
			// We only support inserting one document at a time
			collection.insert(Array.isArray(toInsert) ? toInsert[0] : toInsert, function (err, docs) {
				if (err) return next(err);
				res.locals.id=docs[0]._id.toHexString();
				res.locals.items=JSON.parse('{ "success": true }');
				_self.emit("i", config.notification.eventHandler.channel, req.params.collection, docs);
				return next();
			});
		});
	} else {
		throw new Error("Empty body received");
	}
};

Router.prototype.putToCollection = function (req, res, next) {
	var _self = this;
	var spec = {
		'_id': new this.mongo.BSONPure.ObjectID(req.params.id)
	};

	var toInsert = req.body;
	toInsert.uploadDate = new Date();

	if(toInsert._id) {
		if(toInsert._id == req.params.id)
			delete toInsert._id;
		else
			throw new Error("Trying to update a document with id " + req.params.id + " when the original document id is " + toInsert._id);
	}

	this.db.collection(req.params.collection, function (err, collection) {
		collection.update(spec, toInsert, true, function (err, docs) {
			if(err) return next(err);
			res.locals.id = req.params.id;
			res.locals.items=JSON.parse('{ "success": true }');
			toInsert._id = req.params.id;
			_self.emit("u", config.notification.eventHandler.channel, req.params.collection, toInsert);
			return next();
		});
	});
};

Router.prototype.deleteFromCollection = function (req, res, next) {
	var _self = this;
	var spec = {
		'_id': new this.mongo.BSONPure.ObjectID(req.params.id)
	};
	this.db.collection(req.params.collection, function (err, collection) {
		if(err) return next(err);
		collection.remove(spec, function (err, docs) {
			res.locals.id = req.params.id;
			res.locals.items=JSON.parse('{ "success": true }');
			_self.emit("d", config.notification.eventHandler.channel, req.params.collection, docs);
			return next();
		});
	});
};

Router.prototype.searchText = function(req, res, next) {
	var query = req.query.text ? JSON.parse(req.query.text) : {};
	var limit = req.query.limit ? JSON.parse(req.query.limit) : {};
	var filter = req.query.filter ? JSON.parse(req.query.filter) : {};
	var project = req.query.project ? JSON.parse(req.query.project) : {};

	this.db.command({text:req.params.collection, search:query, limit:limit, filter:filter, project:project}, function(err,results){
		if(err) return next(err);
		results = (results && results.results) ? results.results : [];
		res.locals.items=mongoUtil.beautify(results);
		return next();
	});
};

Router.prototype.transformToCollection = function (req, res, next) {
	if(_.isUndefined(req.files) || _.isEmpty(req.files)) {
		throw new Error("No files were uploaded as part of the transform");
	}
	// TODO: Support Multiple Files Adapter
	var transformAdapter = config.transform.adapters[req.files.file.type];

	if(!_.isUndefined(transformAdapter)) {
		require(transformAdapter)().transform(req, res, next, this.db, this.mongo, config, this);
		return;
	} else {
		throw new Error('{"Error": "404 - Content Type:' + req.files.file.type + ' is not supported"}');
	}
};

Router.prototype.sendResponse = function(req, res, next) {
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
};

Router.prototype.sendCreatedResponse = function (req, res, next) {
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
		var xotree_xml = xotree.writeXML(mongoUtil.beautify(res.locals.items));
		res.send(xotree_xml, 201);
	} else {
		throw new Error("Does not Accept: application/xml or application/json");
	}
};

Router.prototype.asyncResponse = function(req, res, next) {
	var _self = this;
	var query = req.query.query ? JSON.parse(req.query.query) : {};
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
	this.db.collection(req.params.collection, function (err, collection) {
		if (err) return next(err);
		collection.find(query, options, function (err, cursor) {
			if (err) return next(err);
			cursor.each(function (err, doc) {
				// TODO: Handle error - For now Stop
				if (err) return;
				if(!_.isUndefined(doc) && !_.isEmpty(doc)) {
					var id = mongoUtil.beautify(doc);
					// Send document as_is
					if(req.accepts('xml')) {
						result = xotree.writeXML(doc);
					}
					_self.emit("g", req.params.channel, result);
				}
			});
			return;

		});
	});
	res.send(200);
};

module.exports = Router;
