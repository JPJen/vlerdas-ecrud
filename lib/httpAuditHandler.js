/**
 * Console Event Handler - Sends the events to a Console
 * 
 * Created by: Julian Jewel
 * 
 */

var request = require('request');
var inspect = require('util').inspect;
var logger = modules.parent.exports.logger;

module.exports = exports = function(options) {
    return {
	onInsert : function(req, res) {
	    sendAudit("Insert", req, res);
	},
	onUpdate : function(req, res) {
	    sendAudit("Update", req, res);
	},
	onDelete : function(req, res) {
	    sendAudit("Delete", req, res);
	},
	onRead : function(req, res) {
	    sendAudit("Read", req, res);
	},
	onGet : function(req, res) {
	    sendAudit("Get", req, res);
	}
    }

    function sendAudit(message, req, res) {
	var audit = {
	    message : message,
	    req : req,
	    res : res
	};
	var requestOptions = {
	    url : options.url,
	    json : audit,
	    method : 'POST'
	};
	request(requestOptions, function(err, response, body) {
	    if (err) {
		logger.error(err);
	    } else {
		console.log(inspect({
		    res : {
			statusCode : response.statusCode,
			headers : response.headers
		    },
		    body : body
		}));
	    }
	});
    }
}
