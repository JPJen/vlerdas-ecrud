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
var multipart = require('connect-multipart-gridform');
// Export config, so that it can be used anywhere
module.exports.config = config;

var tmp = require("temp");
tmp.track();

// Create a temporary directory
tmp.mkdir('eCrud', function (err, path) {
	if(err) throw err;
	console.log('Temporary Directory:' + path);
	MongoClient.connect(config.db.url, function (err, db) {
		if (err) throw err;
		createApp(db, mongo, path);
	});
});


// Establish an initial connection to MongoDB - Needed for Multipart data

function createApp(db, mongo, path) {
    var app = express();

    app.configure(function () {
		// Need to override for form-data
        app.use(express.methodOverride());
		// Uses special Multipart processing through Formidable
        app.use(multipart({
            db: db, // Needs DB
            mongo: mongo
        }));
		// Log
        app.use(express.logger());
		// Use the body parser if its not multipart
        app.use(express.bodyParser());
		// Special processing for XML
        app.use(function (req, res, next) {
            req.rawBody = req.body;
            if (req.is('application/xml') || req.is('text/plain')) {
                req.rawBody = ''
                req.setEncoding('utf8')
                req.on('data', function (chunk) {
                    req.rawBody += chunk
                })
                req.on('end', function (chunk) {
                    next();
                })
            } else {
                next();
            }
        });
        app.use(app.router);
		// Simple Access Control - TODO: Preferences & Authorizations
        if (config.accessControl) {
            var accesscontrol = require('../lib/accesscontrol');
            app.use(accesscontrol.handle);
        }
		// Only for development
		if(config.debug) {
			app.use(express.errorHandler({ showStack: true, dumpExceptions: true }));
		}
    });

    // You may want to read this post which details some common express / multipart gotchas:
    // http://stackoverflow.com/questions/11295554/how-to-disable-express-bodyparser-for-file-uploads-node-js
    // Initialize Router with all the methods
	var router = require('../lib/router')(db, mongo, path);
	
	// GridFS Read Files
	app.get('/:db/fs', router.getFiles, router.sendResponse);
	// GridFS Create Files
    app.post('/:db/fs', router.sendCreatedResponse);
	// GridFS Download Files
    app.get('/:db/fs/:id', router.downloadFile);
	// GridFS Delete Files
	app.del('/:db/fs/:id', router.removeFile, router.sendResponse);
	// Search for a text
	app.get('/:db/:collection/search', router.searchText, router.sendResponse); 
	// Transform a new document
    app.post('/:db/:collection/transform', router.transformToCollection, router.sendCreatedResponse);
	// Delete a document
    app.del('/:db/:collection/:id', router.deleteFromCollection, router.sendResponse);
	// Update a document
    app.put('/:db/:collection/:id', router.putToCollection, router.sendCreatedResponse);
	// Create a new document
    app.post('/:db/:collection', router.postToCollection, router.sendCreatedResponse);
	// Get a document
    app.get('/:db/:collection/:id?', router.getCollection, router.sendResponse);
	// Listen 
    app.listen(config.server.port, config.server.server, function () {
        console.log('eCRUD server listening on port ' + config.server.port);
    });
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