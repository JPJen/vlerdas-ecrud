/**
 * @author Moroni Pickering
 */

//var Jsonpath = require('JSONPath');
require('datejs');
//makes Date.parse handle many more string formats
_ = require('underscore');
var mongo = require('mongodb');

module.exports = exports = function(config) {
    const NAMESPACE_PROP = "_namespace";
    return {

        toComputableJSON: function(json) {
            //NOTE: JSONPath cannot handle the colon (:) character, and we need to select the parent object for a reference
            //otherwise we only get the value, so we need to need to iterate over the whole json ourselves
            //console.log(Jsonpath.eval(json, '$..*[?(@.nc:DateTime)]')); <--- fails
            var fields = config["transform"]["xmlTags"]["niem/xml"]['computableFields'];

            function namespaceToProperty(fieldKey, value) {
                //TODO: handle the case of no namespace?
                var splitKey = fieldKey.split(':');
                var nameSpace = splitKey[0];
                var keyNoNameSpace = splitKey[1];
                fieldKey[keyNoNameSpace] = value[fieldKey];
                value[keyNoNameSpace] = value[fieldKey];
                value[keyNoNameSpace][NAMESPACE_PROP] = nameSpace;
                delete value[fieldKey];
            }

            function recurseJson(json) {
                _.each(json, function(value, key) {
                    //console.log('key='+key+', value='+value);
                    for (var fieldKey in fields) {
                        if (fields.hasOwnProperty(fieldKey) && value[fieldKey]) {
                            var newVal = value[fieldKey];
                            if (fields[fieldKey] == 'Date') {
                                newVal = Date.parse(newVal);
                            }
                            if (fields[fieldKey] == 'Double') {
                                newVal = new mongo.Double(newVal);
                            }
                            if (fields[fieldKey] == 'Long') {
                                newVal = new mongo.Long(newVal);
                            }
                            //TODO: support xml primitive types: http://www.w3.org/TR/xmlschema11-2/#built-in-primitive-datatypes
                            value[fieldKey] = newVal;

                            namespaceToProperty(fieldKey, value);
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
