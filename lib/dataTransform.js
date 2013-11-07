/**
 * @author Moroni Pickering
 */

//var Jsonpath = require('JSONPath');
require('datejs'); //makes Date.parse handle many more string formats
_ = require('underscore');

module.exports = exports = function (config) {
    return {
        toComputableJSON: function (json) {
            //NOTE: JSONPath cannot handle the colon (:) character, and we need to select the parent object for a reference
            //otherwise we only get the value, so we need to need to iterate over the whole json ourselve
            //console.log(Jsonpath.eval(json, '$..*[?(@.nc:DateTime)]'));
           var fields = config['computableFields'];
           function recurseJson(json) {
                _.each(json, function(value, key){
                    //console.log('key='+key+', value='+value);
                    for (var fieldKey in fields) {
                        if (fields.hasOwnProperty(fieldKey) && value[fieldKey]) {
                            if (fields[fieldKey] == 'Date') {
                                var newVal = Date.parse(value[fieldKey]).toISOString();
                                value[fieldKey] = newVal;
                            }       
                        }
                    }
                    if (_.isObject(value)) {
                        recurseJson(value);
                    }
                });           
            }
            recurseJson(json);
            return json;
        }
    };
};
