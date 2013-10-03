
var connect = require("connect"),
    jsesc = require("jsesc");


/**
 * JSON:
 *
 * Parse JSON request bodies, providing the
 * parsed object as `req.body`.
 *
 * Options:
 *
 *   - `strict`  when `false` anything `JSON.parse()` accepts will be parsed
 *   - `reviver`  used as the second "reviver" argument for JSON.parse
 *   - `limit`  byte limit [1mb]
 *
 * @param {Object} options
 * @return {Function}
 * @api public
 */

var _limit = connect.limit;
var utils = connect.utils;

exports = module.exports = function(options){
  var options = options || {}
    , strict = options.strict !== false;

  var limit = _limit(options.limit || '1mb');

  return function text(req, res, next) {
    if (req._body) return next();
    req.body = req.body || {};

    if (!utils.hasBody(req)) return next();

    // check Content-Type
    if (!req.is('text/plain')) return next();

    // flag as parsed
    req._body = true;

    // parse
    limit(req, res, function(err){
      if (err) return next(err);
      var buf = '';
      req.setEncoding('utf8');
      req.on('data', function(chunk){ buf += chunk });
      req.on('end', function(){
        var first = buf.trim()[0];

        if (0 == buf.length) {
          return next(utils.error(400, 'invalid text, empty body'));
        }

        try {
          req.body = {
                     	"text": jsesc(buf,
                     	{
                     		'json': true,
							'wrap': false
                        })
                     };
        } catch (err){
          err.body = buf;
          err.status = 400;
          return next(err);
        }
        next();
      });
    });
  };
};

exports.regexp = /^application\/([\w!#\$%&\*`\-\.\^~]*\+)?json$/i;

