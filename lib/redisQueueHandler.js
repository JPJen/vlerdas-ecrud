/**
 * Queue Handler - Sends the events to a Redis queue
 *
 * Created by: Julian Jewel
 *
 */

var redis = require("redis");
var logger = module.parent.exports.logger;

module.exports = exports = function (options) {
	var client = redis.createClient(options.redis.port, options.redis.host);
	client.auth(options.redis.auth, function (err) {
		if(err) {
			logger.error('Could not authenticate ' +  options.redis.host + ':' + options.redis.port, err);
			throw err;
		}
		logger.info('Authenticated ' +  options.redis.host + ':' + options.redis.port);
	});
    return {
        onInsert: function (req, res) {
			logger.trace("Received Event for ", channel, collectionName, docs);
			if(_.contains(options.operation, 'i') 
				&& _.contains(options.include, collectionName)) {
				logger.trace("Pushing Insert to Channel ", options.channel, req.param.collection);
				push(options.channel, req.param.collection, res.locals.docs, 'i');
				logger.trace("Pushed Insert to Channel ",  options.channel, req.param.collection);
			}
        },
        onUpdate: function (req, res) {
			if(_.contains(options.operation, 'u') 
				&& _.contains(options.include, collectionName)) {
				logger.trace("Pushing Update to Channel ",  options.channel, req.param.collection);
				push(options.channel, req.param.collection, res.locals.docs, 'u');
				logger.trace("Pushed Update to Channel ",  options.channel, req.param.collection);
			}
        },
        onDelete: function (req, res) {
			if(_.contains(options.operation, 'd') 
				&& _.contains(options.include, collectionName)) {
				logger.trace("Pushing Delete to Channel ",  options.channel, req.param.collection);
				push(options.channel, req.param.collection, res.locals.docs, 'd');
				logger.trace("Pushed Delete to Channel ",  options.channel, req.param.collection);
			}
        }
	}
}

function push(channel, collectionName, docs, operation) {
	// Push to the list
	if(!_.isUndefined(docs) && !_.isEmpty(docs)) {
		if(_.isArray(docs)) {
			_.each(docs, function (doc, i) {
				pushDoc(channel, collectionName, doc, operation);
			})
		} else {
			pushDoc(channel, collectionName, docs, operation);
		}
	}	
}

function pushDoc(channel, collectionName, doc, operation) {
	var json = {};
	json.ts = new Date();
	json.op = operation;
	json.ns = collectionName;
	json.o = doc;
	var jsonString = JSON.stringify(json);
	client.rpush(channel, jsonString);
	logger.info("Published to Channel:" + channel + ' Value:' + jsonString);
}