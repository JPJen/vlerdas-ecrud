/**
 * PDF to JSON to MongoDB Collection Adapter
 *
 * @author Julian Jewel
 */

var S = require('string');
_ = require('underscore');
var multipart = require('connect-multipart-gridform');
var fs = require('fs');

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
                fs.readFile(newPath, function(err, data) {
                    if (err)
                        return next(err);
                    var json = JSON.parse(data);
                    // Documents is the delimiter
                    var json = json.documents;
                    db.collection(req.params.collection, function(err, collection) {
                        if (err)
                            return next(err);
                        if (!_.isUndefined(json)) {
                            json.uploadDate = new Date();
                            collection.insert(json, function(err, docs) {
                                if (err)
                                    return next(err);
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
