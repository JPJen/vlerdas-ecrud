/**
 * Queue Handler - Sends the events to a Redis queue
 *
 * Created by: Julian Jewel
 *
 */
var config = module.parent.exports.config;
var redis = require("redis");
var util = require ("../lib/util.js");
var client = redis.createClient(config.notification.eventHandler.redis.port, config.notification.eventHandler.redis.host);

module.exports = exports = function () {
    return {
        onInsert: function (collectionName, docs) {
			if(_.contains(config.notification.eventHandler.operation, 'i') 
				&& !_.contains(config.notification.eventHandler.exclude, collectionName)) {
				push(collectionName, docs, 'i');
			}
        },
        onUpdate: function (collectionName, docs) {
			if(_.contains(config.notification.eventHandler.operation, 'u') 
				&& !_.contains(config.notification.eventHandler.exclude, collectionName)) {
				push(collectionName, docs, 'u');
			}
        },
        onDelete: function (collectionName, docs) {
			if(_.contains(config.notification.eventHandler.operation, 'd') 
				&& !_.contains(config.notification.eventHandler.exclude, collectionName)) {
				push(collectionName, docs, 'd');
			}
        }
	}
}

function push(collectionName, docs, operation) {
	// Push to the list
	if(!_.isUndefined(docs) && !_.isEmpty(docs)) {
		if(_.isArray(docs)) {
			_.each(docs, function (doc, i) {
				pushDoc(collectionName, doc, operation);
			}) 
		} else {
			pushDoc(collectionName, docs, operation);
		}
	}
	
}

function pushDoc(collectionName, doc, operation) {
	var json = {};
	json.ts = new Date();
	json.op = operation;
	json.ns = collectionName;
	json.o = doc;
	var jsonString = JSON.stringify(json);
	client.rpush(config.notification.eventHandler.channel, jsonString);
	if(config.debug) {
		console.log("Published:" + jsonString);
	}
}