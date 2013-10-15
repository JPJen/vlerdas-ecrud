/**
 * Queue Handler - Sends the events to a Redis queue
 *
 * Created by: Julian Jewel
 *
 */
var config = module.parent.exports.config;
var redis = require("redis");
var client = redis.createClient(config.notification.eventHandler.redis.port, config.notification.eventHandler.redis.host);

module.exports = exports = function () {
    return {
        onInsert: function (channel, collectionName, docs) {
			if(_.contains(config.notification.eventHandler.operation, 'i') 
				&& !_.contains(config.notification.eventHandler.exclude, collectionName)) {
				push(channel, collectionName, docs, 'i');
			}
        },
        onUpdate: function (channel, collectionName, docs) {
			if(_.contains(config.notification.eventHandler.operation, 'u') 
				&& !_.contains(config.notification.eventHandler.exclude, collectionName)) {
				push(channel, collectionName, docs, 'u');
			}
        },
        onDelete: function (channel, collectionName, docs) {
			if(_.contains(config.notification.eventHandler.operation, 'd') 
				&& !_.contains(config.notification.eventHandler.exclude, collectionName)) {
				push(channel, collectionName, docs, 'd');
			}
        },
        onGet: function (channel, doc) {
			client.rpush(channel, doc);
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