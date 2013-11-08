/**
 * @author Moroni Pickering
 */

//var Jsonpath = require('JSONPath');
require('datejs'); //makes Date.parse handle many more string formats
_ = require('underscore');
var mongo = require('mongodb');

module.exports = exports = function (config) {
    return {
        
        //TODO: use this function on all json prior to inserting into a mongo collection
        
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
                                var newVal = Date.parse(value[fieldKey]);
                                value[fieldKey] = newVal;
                            }  
                            //new mongo.Double(number) //Floating point numbers
                            //new mongo.Long(numberString) //Integers
                            //TODO: search 'can xsd specify float or integers?' then look in the xsds
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
