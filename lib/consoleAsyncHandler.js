/**
 * Console Handler - Sends the events to the console
 *
 * Created by: Julian Jewel
 *
 */

module.exports = exports = function () {
    return {
        onGet: function (channel, doc) {
			console.log('Channel: ' + channel + ' Document:' + doc);
        }
	}
}