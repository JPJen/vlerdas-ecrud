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
        onGet: function (req, res, doc) {
			client.rpush(req.params.channel, doc);
        }
	}
}