var connect = require('connect'),
    xml = require('./xml'),
    text = require('./text'),
    multipart = require('connect-multipart-gridform'),
    urlencoded = require('./urlencoded');


exports = module.exports = function bodyParser(options)
{
	var _bodyParser = connect.bodyParser(options),
	    _xml = xml(options),
	    _text = text(options),
	    _multipart = multipart(options),
	    _urlencoded = urlencoded(options);

	return function bodyParser(req, res, next)
	{
		_multipart(req, res, function(err) {
			if (err) return next(err);
			_xml(req, res, function (err) {
				if (err) return next(err);
				_text(req, res, function (err) {
					if (err) return next(err);
					_urlencoded(req, res, function (err) {
						if (err) return next(err);
						// TODO: replace this with JSON body parser since we've pretty much
						// overriden everything else connect.bodyParser does anyway.
						_bodyParser(req, res, next);
					});
				});
			});
		});
	}
};