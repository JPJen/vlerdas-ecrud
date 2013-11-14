/**
 * Console Event Handler - Sends the events to a Console
 *
 * Created by: Julian Jewel
 *
 */

module.exports = exports = function(options) {
    return {
        onInsert: function(req, res) {
            sendAudit("Insert", req, res);
        },
        onUpdate: function(req, res) {
            sendAudit("Update", req, res);
        },
        onDelete: function(req, res) {
            sendAudit("Delete", req, res);
        },
        onRead: function(req, res) {
            sendAudit("Read", req, res);
        },
        onGet: function(req, res) {
            sendAudit("Get", req, res);
        }
    }

    function sendAudit(message, req, res) {
        console.log('======= ' + message + ' =======');
        console.log('URL: ' + options.url);
        // console.log(req);
        // console.log(res);
        console.log('======= END ' + message + ' =======');
    }
}
