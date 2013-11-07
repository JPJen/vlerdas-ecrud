/**
 * Console Handler - Sends the events to the console
 * 
 * Created by: Julian Jewel
 * 
 */

module.exports = exports = function(options) {
    return {
	onGet : function(req, res, doc) {
	    console.log('Channel: ' + req.params.channel + ' Document:' + doc);
	}
    }
}