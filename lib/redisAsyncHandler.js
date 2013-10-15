/**
 * Queue Handler - Sends the events to a Redis queue
 *
 * Created by: Julian Jewel
 *
 */
var config = module.parent.exports.config;
var redis = require("redis");

var client = redis.createClient(config.async.eventHandler.redis.port, config.async.eventHandler.redis.host);

module.exports = exports = function () {
    return {
        onGet: function (channel, doc) {
			client.rpush(channel, doc);
        }
	}
}