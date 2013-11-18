/**
 * @author Moroni Pickering
 */

//var Jsonpath = require('JSONPath');
require('datejs');
//makes Date.parse handle many more string formats
_ = require('underscore');
var mongo = require('mongodb');

module.exports = exports = function(config) {
    return {

        toComputableJSON: function(json) {
            //NOTE: JSONPath cannot handle the colon (:) character, and we need to select the parent object for a reference
            //otherwise we only get the value, so we need to need to iterate over the whole json ourselves
            //console.log(Jsonpath.eval(json, '$..*[?(@.nc:DateTime)]')); <--- fails
            var fields = config["transform"]["xmlTags"]["niem/xml"]['computableFields'];
            function recurseJson(json) {
                _.each(json, function(value, key) {
                    //console.log('key='+key+', value='+value);
                    for (var fieldKey in fields) {
                        if (fields.hasOwnProperty(fieldKey) && value[fieldKey]) {
                            var newVal;
                            if (fields[fieldKey] == 'Date') {
                                var newVal = Date.parse(value[fieldKey]);
                            }
                            if (fields[fieldKey] == 'Double') {
                                var newVal = new mongo.Double(value[fieldKey]);
                            }
                            if (fields[fieldKey] == 'Long') {
                                var newVal = new mongo.Long(value[fieldKey]);
                            }
                            //TODO: support xml primitive types: http://www.w3.org/TR/xmlschema11-2/#built-in-primitive-datatypes
                            value[fieldKey] = newVal;
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
