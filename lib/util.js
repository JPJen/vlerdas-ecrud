var config = module.parent.parent.exports.config;
_ = require('underscore');
var Timestamp = require('mongodb').Timestamp;

module.exports = util = {

	transformBSONIdtoHexId: function(docs) {
		docs = (docs) ? docs : [];
		if(_.isArray(docs)) {
			var result=[];
			docs.forEach(function (doc) {
				if(_.isObject(doc._id)) {
					doc._id = doc._id.toHexString();
				} else if(_.isObject(doc.obj._id)) {
					// Special case for text searches
					doc.obj._id = doc.obj._id.toHexString();
				} else if (_.isObject(doc.fileUpload.id)) {
					doc.fileUpload.id = doc.fileUpload.id.toHexString();
				}
				result.push(doc);
			});
			return result;
		} else {
			if (_.isObject(docs)) {
				if(_.isObject(docs._id)) {
					docs._id = docs._id.toHexString();
				}
				else if (_.isObject(docs.fileUpload) && _.isObject(docs.fileUpload.id)) {
					docs.fileUpload.id = docs.fileUpload.id.toHexString();
				}
			}
			return docs;
		}
	},
		
	getTimestamp: function(date) {
		var time;
		date || (date = new Date());
		time = Math.floor(date.getTime() / 1000);
		return new Timestamp(0, time);
	},
	getDate: function(timestamp) {
		return new Date(timestamp.high_ * 1000);
	}

};