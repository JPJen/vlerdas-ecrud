/**
 * Entry point for the RESTFul Service. Provides CRUD operations on a database.
 *
 * Created by: Julian Jewel
 *
 */
var fs = require("fs"), sys = require("sys");
var express = require('express');
var config = require('config');
// Export config, so that it can be used anywhere
module.exports.config = config;
var Log = require('vcommons').log;
var logger = Log.getLogger('eCrud', config.log);
module.exports.logger = logger;
var bodyParser = require('vcommons').multipartBodyParser;
var tmp = require("temp");
tmp.track();
var http = require('http');
var https = require('https');
var Router = require('../lib/router');
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
    // Fork workers.
    for (var i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('online', function(worker) {
        logger.info('A worker with #' + worker.id);
    });
    cluster.on('listening', function(worker, address) {
        logger.info('A worker is now connected to ' + address.address + ':' + address.port);
    });
    cluster.on('exit', function(worker, code, signal) {
        logger.info('worker ' + worker.process.pid + ' died');
    });
} else {
    // Create a temporary directory
    tmp.mkdir('eCrud', function(err, path) {
        if (err)
            throw err;
        logger.info('Temporary Directory:' + path);
        config.tempdir = path;
        new Router(config.db, function(router) {
            createApp(router);
        });
    });
}

// Establish an initial connection to MongoDB - Needed for Multipart data
function createApp(router) {
    var app = express();

    app.configure(function() {
        var mountPoint = (_.isUndefined(config.context) ? '' : config.context) + '/' + config.db.name;

        // enable web server logging; pipe those log messages through winston
        var winstonStream = {
            write: function(message, encoding) {
                logger.trace(message);
            }
        };

        // Need to override for form-data
        app.use(mountPoint, express.methodOverride());
        // Simple Access Control - TODO: Preferences & Authorizations
        if (config.accessControl) {
            var accessControl = require('vcommons').accessControl;
            app.use(mountPoint, accessControl());
        }
        // Uses our custom bodyParser with special handling for multipart, xml,
        // and text.
        app.use(mountPoint, bodyParser({
            db: router.db, // Needs DB
            mongo: router.mongo
        }));
        // Log
        app.use(express.logger({
            stream: winstonStream
        }));
        app.use(mountPoint, app.router);
        // Only for development
        if (config.debug) {
            app.use(express.errorHandler({
                showStack: true,
                dumpExceptions: true
            }));
        }
    });

    // You may want to read this post which details some common express /
    // multipart gotchas:
    // http://stackoverflow.com/questions/11295554/how-to-disable-express-bodyparser-for-file-uploads-node-js
    // Initialize Router with all the methods

    // Async. Query of docs
    app.get('/:collection/async/:channel', router.asyncResponse.bind(router));
    // Search for a text
    app.get('/:collection/search', router.searchText.bind(router), router.sendResponse.bind(router));
    // Transform a new document
    app.post('/:collection/transform', router.transformToCollection.bind(router), router.sendCreatedResponse
            .bind(router));
    // GridFS Read Files
    app.get('/fs', router.getFiles.bind(router), router.sendResponse.bind(router));
    // GridFS Create Files
    app.post('/fs', router.sendCreatedResponse.bind(router));
    // GridFS Download Files
    app.get('/fs/:id', router.downloadFile.bind(router));
    // GridFS Delete Files
    app.del('/fs/:id', router.removeFile.bind(router), router.sendResponse.bind(router));
    // Delete a document
    app.del('/:collection/:id', router.deleteFromCollection.bind(router), router.sendResponse.bind(router));
    // Delete document
    app.del('/:collection', router.bulkDeleteFromCollection.bind(router), router.sendResponse.bind(router));
    // Update a document
    app.put('/:collection/:id', router.putToCollection.bind(router), router.sendCreatedResponse.bind(router));
    // Create a new document
    app.post('/:collection', router.postToCollection.bind(router), router.sendCreatedResponse.bind(router));
    // Get a document
    app.get('/:collection/:id?', router.getCollection.bind(router), router.sendResponse.bind(router));


    setupEventHandlers(router);

    // Listen
    if (!_.isUndefined(config.server) || !_.isUndefined(config.secureServer)) {
        if (!_.isUndefined(config.server)) {
            var server = http.createServer(app);
            server.on('connection', function(socket) {
                logger.debug('Connection made to server.');
            });
            server.on('timeout', function(socket) {
                logger.debug('A timeout occurred on a socket connected on http://' + config.server.host + ':' + config.server.port);
                socket.destroy();
            });
            if (!_.isUndefined(config.server.timeout)) {
                server.setTimeout(config.server.timeout);
            }
            server.listen(config.server.port, config.server.host, function() {
                logger.info("eCRUD server listening at http://" + config.server.host + ":" + config.server.port);
            });
        }

        if (!_.isUndefined(config.secureServer)) {
            var secureServer = https.createServer(fixOptions(config.secureServer.options), app);
            secureServer.on('connection', function(socket) {
                logger.debug('Connection made to secureServer.');
                if (!_.isUndefined(config.secureServer.timeout)) {
                    socket.setTimeout(config.secureServer.timeout);
                }
                socket.on('timeout', function() {
                    logger.debug('A timeout occurred on a socket connected on https://' + config.secureServer.host + ':' + config.secureServer.port);
                    socket.destroy();
                });
            });
            secureServer.listen(config.secureServer.port, config.secureServer.host, function() {
                logger.info("eCRUD server listening at https://" + config.secureServer.host + ":"
                        + config.secureServer.port);
            });
        }
    } else {
        logger.error("Configuration must contain a server or secureServer.");
        process.exit();
    }
}

function fixOptions(configOptions) {
    var options = {};

    if (!_.isUndefined(configOptions.key) && _.isString(configOptions.key)) {
        options.key = fs.readFileSync(configOptions.key);
    }

    if (!_.isUndefined(configOptions.cert) && _.isString(configOptions.cert)) {
        options.cert = fs.readFileSync(configOptions.cert);
    }

    if (!_.isUndefined(configOptions.pfx) && _.isString(configOptions.pfx)) {
        options.pfx = fs.readFileSync(configOptions.pfx);
    }

    return options;
}

function setupEventHandlers(router) {
    if (!_.isUndefined(config.eventHandlers) && _.isArray(config.eventHandlers)) {
        for (var i = 0; i < config.eventHandlers.length; ++i) {
            var eh = config.eventHandlers[i];
            var module = require(eh.module)(eh.options);
            for (var j = 0; j < eh.events.length; ++j) {
                var e = eh.events[j];
                router.on(e.event, module[e.method]);
            }
        }
    }
}

// Default exception handler
process.on('uncaughtException', function(err) {
    logger.error('Caught exception: ' + err.stack);
    process.exit();
});

process.on('SIGINT', function() {
    logger.info("Shutting down from  SIGINT (Crtl-C)");
    process.exit();
});

// Default exception handler
process.on('exit', function(err) {
    // Clean up
    tmp.cleanup();
    logger.info("Exit");
});