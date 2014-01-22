/**
 * PDF to JSON to MongoDB Collection Adapter
 *
 * @author Julian Jewel
 */

var S = require('string');
_ = require('underscore');
var PFParser = require("pdf2json");
var multipart = require('connect-multipart-gridform');
var fs = require('fs');
var jsonpath = require("JSONPath").eval;
var querystring = require("querystring");

module.exports = exports = function() {
    return {
        transform: function(req, res, next, db, mongo, config, event) {
            var readstream = multipart.gridform.gridfsStream(db, mongo).createReadStream(req.files.file.id);
            readstream.on('open', function() {
                var store = readstream._store;
                var filename = store.filename;
                var newPath = config.tempdir + '/' + req.files.file.id + '_' + filename;
                // Stage file
                var writestream = fs.createWriteStream(newPath);
                readstream.pipe(writestream);
                if (config.debug)
                    console.log('File stored in a new location:' + newPath);
                // Recognise text of any language in any format
                var pdfParser = new PFParser();
                pdfParser.on("pdfParser_dataReady", function(evtData) {
                    try {
                        var textData = evtData.data;
                        db.collection(req.params.collection, function(err, collection) {
                            // Extract Text portion and save it in a separate
                            // node
                            var data = jsonpath(textData, "$..T");
                            var aggregateData = '';
                            for (var i = 0; i < data.length; i++) {
                                aggregateData += data[i];
                            }
                            aggregateData = querystring.unescape(aggregateData);
                            textData.text = aggregateData;
                            textData.uploadDate = new Date();
                            var dataTransform = require('../../lib/dataTransform.js')(config);
                            textData = dataTransform.toComputableJSON(textData);
                            collection.insert(Array.isArray(textData) ? textData[0] : textData, function(err, docs) {
                                if (err)
                                    return next(err);
                                res.locals.items = textData;
                                res.locals.docs = docs;
                                event.emit("i", req, res);
                                return next();
                            });
                        });
                        evtData.destroy();
                        evtData = null;
                    } catch (err) {
                        // Ignore promise being closed
                        if (config.debug)
                            console.log(err);
                    }
                });
                pdfParser.on("pdfParser_dataError", function(evtData) {
                    evtData.destroy();
                    evtData = null;
                    if (config.debug) {
                        console.log('Error occured when converting PDF:' + evtData);
                    }
                    return next();
                });
                pdfParser.loadPDF(newPath);
            });
        }
    };
};
