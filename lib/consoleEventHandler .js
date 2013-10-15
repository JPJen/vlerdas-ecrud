/**
 * Console Event Handler - Sends the events to a Console
 *
 * Created by: Julian Jewel
 *
 */
var config = module.parent.exports.config;

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
	console.log("Published to Channel:" + channel + ' Value:' + jsonString);
}