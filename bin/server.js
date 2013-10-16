/**
 * Entry point for the RESTFul Service. Provides CRUD operations on a database.
 *
 * Created by: Julian Jewel
 *
 */
var fs = require("fs"),
    sys = require("sys")
var express = require('express')
var config = require('config')
var mongo = require('mongodb');
var MongoClient = mongo.MongoClient;
// Export config, so that it can be used anywhere
module.exports.config = config;
var bodyParser = require("../node_modules/vcommons/express/multipartBodyParser");
var tmp = require("temp");
tmp.track();
var http = require('http');
var https = require('https');

// Create a temporary directory
tmp.mkdir('eCrud', function (err, path) {
	if(err) throw err;
	console.log('Temporary Directory:' + path);
	config.tempdir = path;
	MongoClient.connect(config.db.url, function (err, db) {
		if (err) throw err;
		createApp(db, mongo);
	});
});


// Establish an initial connection to MongoDB - Needed for Multipart data

function createApp(db, mongo) {
    var app = express();

    app.configure(function () {
		// Need to override for form-data
        app.use(express.methodOverride());
		// Simple Access Control - TODO: Preferences & Authorizations
        if (config.accessControl) {
            var accessControl = require('../node_modules/vcommons/access/accesscontrol');
            app.use(accessControl());
        }
		// Uses our custom bodyParser with special handling for multipart, xml, and text.
        app.use(bodyParser({
            db: db, // Needs DB
            mongo: mongo
        }));
		// Log
        app.use(express.logger());
        app.use(app.router);
		// Only for development
		if(config.debug) {
			app.use(express.errorHandler({ showStack: true, dumpExceptions: true }));
		}
    });

    // You may want to read this post which details some common express / multipart gotchas:
    // http://stackoverflow.com/questions/11295554/how-to-disable-express-bodyparser-for-file-uploads-node-js
    // Initialize Router with all the methods
	var router = require('../lib/router')(db, mongo);

	// Async. Query of docs
	app.get('/' + config.db.name + '/:collection/async/:channel', router.asyncResponse);
	// Search for a text
	app.get('/' + config.db.name + '/:collection/search', router.searchText, router.sendResponse);
	// Transform a new document
    app.post('/' + config.db.name + '/:collection/transform', router.transformToCollection, router.sendCreatedResponse);
	// GridFS Read Files
	app.get('/' + config.db.name + '/fs', router.getFiles, router.sendResponse);
	// GridFS Create Files
    app.post('/' + config.db.name + '/fs', router.sendCreatedResponse);
	// GridFS Download Files
    app.get('/' + config.db.name + '/fs/:id', router.downloadFile);
	// GridFS Delete Files
	app.del('/' + config.db.name + '/fs/:id', router.removeFile, router.sendResponse);
	// Delete a document
    app.del('/' + config.db.name + '/:collection/:id', router.deleteFromCollection, router.sendResponse);
	// Update a document
    app.put('/' + config.db.name + '/:collection/:id', router.putToCollection, router.sendCreatedResponse);
	// Create a new document
    app.post('/' + config.db.name + '/:collection', router.postToCollection, router.sendCreatedResponse);
	// Get a document
    app.get('/' + config.db.name + '/:collection/:id?', router.getCollection, router.sendResponse);

	// Listen
	if (!_.isUndefined(config.server) || !_.isUndefined(config.secureServer)) {
		if (!_.isUndefined(config.server)) {
			http.createServer(app).listen(config.server.port, config.server.host, function() {
				console.log("eCRUD server listening at http://" + config.server.host + ":" + config.server.port);
			});
		}

		if (!_.isUndefined(config.secureServer)) {
			https.createServer(fixOptions(config.secureServer.options), app).listen(config.secureServer.port, config.secureServer.host, function() {
				console.log("eCRUD server listening at https://" + config.secureServer.host + ":" + config.secureServer.port);
			});
		}
	}
	else {
		console.error("Configuration must contain a server or secureServer.");
		process.exit();
	}

	/*
    app.listen(config.server.port, config.server.server, function () {
        console.log('eCRUD server listening on port ' + config.server.port);
    });*/
}

function fixOptions(configOptions)
{
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

// Default exception handler
process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
});

process.on( 'SIGINT', function() {
  console.log( "\nShutting down from  SIGINT (Crtl-C)" )
  process.exit( )
})
// Default exception handler
process.on('exit', function (err) {
	// Clean up
	tmp.cleanup();
});