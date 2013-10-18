/**
 * Queue Handler - Sends the events to a Redis queue
 *
 * Created by: Julian Jewel
 *
 */

var redis = require("redis");

module.exports = exports = function (options) {
	var client = redis.createClient(options.port, options.host);
    return {
        onInsert: function (req, res) {
			if(_.contains(options.operation, 'i')
				&& !_.contains(options.exclude, req.params.collection)) {
				push(options.channel, req.param.collection, res.locals.docs, 'i');
			}
        },
        onUpdate: function (req, res) {
			if(_.contains(options.operation, 'u')
				&& !_.contains(options.exclude, req.params.collection)) {
				push(options.channel, req.params.collection, res.locsls.docs, 'u');
			}
        },
        onDelete: function (req, res) {
			if(_.contains(options.operation, 'd')
				&& !_.contains(options.exclude, req.params.collection)) {
				push(options.channel, req.params.collection, res.locals.docs, 'd');
			}
        },
        onGet: function (req, res) {
			client.rpush(options.channel, res.locals.doc);
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
	if(config.debug) {
		console.log("Published to Channel:" + channel + ' Value:' + jsonString);
	}
}