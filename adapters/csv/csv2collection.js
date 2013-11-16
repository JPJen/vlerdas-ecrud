/**
 * PDF to JSON to MongoDB Collection Adapter
 *
 * @author Julian Jewel
 */

var S = require('string');
_ = require('underscore');
var multipart = require('connect-multipart-gridform');
var fs = require('fs');
var csvjs = require('csv-json');

module.exports = exports = function() {
    return {
        transform: function(req, res, next, db, mongo, config, event) {
            var readstream = multipart.gridform.gridfsStream(db, mongo).createReadStream(req.files.file.id);
            readstream.on('open', function() {
                var newPath = config.tempdir + '/' + req.files.file.id + '_' + readstream._store.filename;
                // Stage file
                var writestream = fs.createWriteStream(newPath);
                readstream.pipe(writestream);
                if (config.debug)
                    console.log('File stored in a new location:' + newPath);
                csvjs.parseCsv(newPath, {
                    options: { // Options:
                        delimiter: ','
                    }
                }, function(err, json, stats) {
                    if (err)
                        return next(err);
                    db.collection(req.params.collection, function(err, collection) {
                        if (err)
                            return next(err);
                        if (!_.isUndefined(json)) {
                            var dataTransform = require('../../lib/dataTransform.js')(config);
                            json = dataTransform.toComputableJSON(json);
                            json.uploadDate = new Date();
                            collection.insert(json, function(err, docs) {
                                res.locals.items = docs;
                                res.locals.docs = docs;
                                event.emit("i", req, res);
                                return next();
                            });
                        }
                    });
                });
            });
        }
    };
};
