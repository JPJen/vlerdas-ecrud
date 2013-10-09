var mongo = require("mongodb"),
    config = module.parent.exports.config,
    Ofuda = require('ofuda');

var ofuda = new Ofuda({headerPrefix:'Amz', hash: 'sha1', serviceLabel: 'AWS', debug: false});

/*
 * accesscontrol - handles http access control based on configuration
 */
exports = module.exports = function accessControl(options)
{
	return function accessControl(req, res, next)
	{
		var isAuthorized = function(user) {
			return user.allowMethods === "*" || user.allowMethods.indexOf(req.method) >= 0;
		};

		var validateCredentials = function(requestAccessKeyId) {
			var authenticatedUser = config.accessControl[requestAccessKeyId];
			return authenticatedUser !== null && isAuthorized(authenticatedUser) ? authenticatedUser : null;
		};

 		if(ofuda.validateHttpRequest(req, validateCredentials)){
			return next();
    	}
    	else {
        	res.writeHead(401)
        	res.end('Authorization failed!');
		}

		/*
		if (req.header('Origin')) {
			if (config.accessControl.allowOrigin) {
				res.header('Access-Control-Allow-Origin', config.accessControl.allowOrigin);
			}
			if (config.accessControl.allowMethods) {
				res.header('Access-Control-Allow-Methods', config.accessControl.allowMethods);
			}
			if (req.header('Access-Control-Request-Headers')) {
				res.header('Access-Control-Allow-Headers', req.header('Access-Control-Request-Headers'));
			}
		}
		return next();
		*/
	}
};
