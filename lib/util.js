var config = module.parent.parent.exports.config;
_ = require('underscore');

module.exports.transformBSONIdtoHexId = function(docs) {
	docs = (docs) ? docs : [];
	if(_.isArray(docs)) {
		var result=[];
		docs.forEach(function (doc) {
			if(_.isObject(doc._id)) {
				doc._id = doc._id.toHexString();
			} else if(_.isObject(doc.obj._id)) {
				// Special case for text searches
				doc.obj._id = doc.obj._id.toHexString();
			}
			result.push(doc);
		});
		return result;
	} else {
		if(_.isObject(docs) && _.isObject(docs._id)) {
			docs._id = docs._id.toHexString();
		}
		return docs;
	}
};