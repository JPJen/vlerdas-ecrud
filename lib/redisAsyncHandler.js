/**
 * Queue Handler - Sends the events to a Redis queue
 *
 * Created by: Julian Jewel
 *
 */
var logger = module.parent.exports.logger;
var redis = require("redis")

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
        onGet: function (req, res, doc) {
			logger.trace("Pushing to Channel:", channel, " Document: ", doc);
			client.rpush(req.params.channel, doc);
			logger.trace("Pushed Document to Channel:", channel);
        }
	}
}