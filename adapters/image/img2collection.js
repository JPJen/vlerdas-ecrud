/**
 * PDF to JSON to MongoDB Collection Adapter
 * @author Julian Jewel
 */

var S = require('string');
_ = require('underscore');
var multipart = require('connect-multipart-gridform');
var fs = require('fs');
var nodecr = require('nodecr');


module.exports = exports = function () {
    return {
        transform: function (req, res, next, db, mongo, config, event) {
			var readstream = multipart.gridform.gridfsStream(db, mongo).createReadStream(req.files.file.id);
			readstream.on('open', function () {
                var store = readstream._store;
				var filename = store.filename;
				var newPath = config.tempdir + '/' + req.files.file.id + '_' + filename;
				// Stage file
				var writestream = fs.createWriteStream(newPath);
				readstream.pipe(writestream);
				if(config.debug)
					console.log('File stored in a new location:' + newPath);
									
				nodecr.process(newPath, function (err, text) {
					if (err) {
						throw err;
					} else {
						var toInsert = {
							// TODO: Remove hardcoding
							"text": text
						};
						toInsert.uploadDate = new Date();

						db.collection(req.params.collection, function (err, collection) {
							collection.insert(Array.isArray(toInsert) ? toInsert[0] : toInsert, function (err, docs) {
								res.locals.id = docs[0]._id.toHexString();
								res.locals.items = toInsert;
								if(config.notification.eventHandler.enabled)
									event.emit("i", config.notification.eventHandler.channel, req.params.collection, docs);
								return next();
							});
						});
					}
				});
			});
		}
    };
};

