/**
 * Queue Handler - Sends the events to a Redis queue
 *
 * Created by: Julian Jewel
 *
 */

var logger = module.parent.exports.logger;
var redis = require("redis");
var CryptoJS = require("crypto-js");
var JsonFormatter = require('vcommons').jsonFormatter;

module.exports = exports = function(options) {
    var client = redis.createClient(options.redis.port, options.redis.host);
    client.auth(options.redis.auth, function(err) {
        if (err) {
            logger.error('Could not authenticate ' + options.redis.host + ':' + options.redis.port, err);
            throw err;
        }
        logger.info('Authenticated ' + options.redis.host + ':' + options.redis.port);
    });
    return {
        onInsert: function(req, res) {
            logger.trace("Received Event for ", options.redis.channel, req.params.collection, res.locals.docs);
            if (_.contains(options.operation, 'i') && _.contains(options.include, req.params.collection)) {
                logger.trace("Pushing Insert to Channel ", options.redis.channel, req.params.collection);
                push(options.redis.channel, options.redis.encryption, req.params.collection, res.locals.docs, 'i');
                logger.trace("Pushed Insert to Channel ", options.redis.channel, req.params.collection);
            }
        },
        onUpdate: function(req, res) {
            if (_.contains(options.operation, 'u') && _.contains(options.include, req.params.collection)) {
                logger.trace("Pushing Update to Channel ", options.redis.channel, req.params.collection);
                push(options.redis.channel, options.redis.encryption, req.params.collection, res.locals.docs, 'u');
                logger.trace("Pushed Update to Channel ", options.redis.channel, req.params.collection);
            }
        },
        onDelete: function(req, res) {
            if (_.contains(options.operation, 'd') && _.contains(options.include, req.params.collection)) {
                logger.trace("Pushing Delete to Channel ", options.redis.channel, req.params.collection);
                push(options.redis.channel, options.redis.encryption, req.params.collection, res.locals.docs, 'd');
                logger.trace("Pushed Delete to Channel ", options.redis.channel, req.params.collection);
            }
        }
    }
    function push(channel, encryption, collectionName, docs, operation) {
        // Push to the list
        if (!_.isUndefined(docs) && !_.isEmpty(docs)) {
            if (_.isArray(docs)) {
                _.each(docs, function(doc, i) {
                    pushDoc(channel, encryption, collectionName, doc, operation);
                })
            } else {
                pushDoc(channel, encryption, collectionName, docs, operation);
            }
        }
    }

    function pushDoc(channel, encryption, collectionName, doc, operation) {
        var jsonString = JSON.stringify(doc);
        if (!_.isUndefined(encryption) && encryption.enabled) {
            logger.trace("Encrypting Data ", jsonString);
            var encrypted = CryptoJS.AES.encrypt(jsonString, encryption.passPhrase, {
                format: JsonFormatter
            });
            logger.trace("Encrypted Data ", encrypted);
            client.rpush(channel, encrypted);
        } else {
            client.rpush(channel, jsonString);
        }
        logger.trace("Published to Channel:" + channel + ' Value:' + jsonString);
        logger.info("Published Message to Channel:" + channel);
    }
}
