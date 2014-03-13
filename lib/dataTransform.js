/**
 * @author Moroni Pickering
 */

//var Jsonpath = require('JSONPath');
require('datejs');
//makes Date.parse handle many more string formats
_ = require('underscore');
var mongo = require('mongodb');
UTIL = {};
UTIL.XML = require('vcommons').objTree;
// Globally available for conversion
var xotree = new UTIL.XML.ObjTree();
var S = require('string');
var config = require('config');
var logger = require('vcommons').log.getLogger('eCrud', config.log);

//NOTE: by adding a require() to this module, the default toJSON on Date objects will be replaced
if (Date.prototype.toJSON_default == null) {
    Date.prototype.toJSON_default = Date.prototype.toJSON;
    Date.prototype.toJSON = function() {
        return "$Date(" + this.toISOString() + ")";
    };
}

//NOTE: by adding a require() to this module, the default toJSON on mongo.ObjectID objects will be replaced
if (mongo.ObjectID.prototype.toJSON_default == null) {
    mongo.ObjectID.prototype.toJSON_default = mongo.ObjectID.prototype.toJSON;
    mongo.ObjectID.prototype.toJSON = function() {
        return "$ObjectID(" + this.toHexString() + ")";
    };
}

module.exports = exports = function(computableFields) {
    const NAMESPACE_PROP = "__namespace";
    return {

        bodyParseJsonReviver: function jsonToBSONReviver(key, value) {
            /*
             decorate values with “$Date(...)” or “$ObjectID(..)”
             First check each value for typeof “string” then check if it starts with “$” .
             If that’s true then we can run through the different RegEx matches for the different data types.
             Date, and ObjectID for now, could be more in the future.
            */
            /*NOTE: if we add more data types other than Date and ObjectID, we might want to make this more generic
                instead of just added more nested else if statements. Maybe create an object with a type "key"
                and a callback function that provides the function to generate the new type, then could loop over
                the keys, RegEx parse, if found call the callback
            */
            var retVal = value;
            if (typeof(value) == "string" && S(value).startsWith("$")) {
                var dateRegExResult = /\$Date\((.*)\)/.exec(value);
                if (dateRegExResult) {
                    retVal = Date.parse(dateRegExResult[1]);
                    if (retVal === null) {
                        retVal = value;
                        logger.debug("jsonToBSONReviver Invalid datejs format: '"+value+"'");
                    }
                } else {
                    var objectIdRegExResult = /\$ObjectID\((.*)\)/.exec(value);
                    if (objectIdRegExResult) {
                        try {
                            retVal = new mongo.ObjectID(objectIdRegExResult[1]);
                        } catch (err) {
                            logger.debug("jsonToBSONReviver Invalid ObjectID: '"+value+"'");
                        }
                    }
                }
            }
            return retVal;
        },

        jsonReplacer : function bsonToJSONReplacer(key, value) {
            var retVal = value;
            //logger.debug(key + ", " + Object.prototype.toString.call(value));
            if (Object.prototype.toString.call(value) === '[object Date]') {

            }
            //if (key === "uploadDate")
                //return "$Date("+value+")";
            return retVal;
        },

        toComputableJSON: function(json) {
            if (computableFields == null)
                return json;
            //NOTE: JSONPath cannot handle the colon (:) character, and we need to select the parent object for a reference
            //otherwise we only get the value, so we need to need to iterate over the whole json ourselves
            //console.log(Jsonpath.eval(json, '$..*[?(@.nc:DateTime)]')); <--- fails
            //TODO: change so this function requires passing in the computableFields, instead of assuming niem/xml

            function namespaceToProperty(fieldKey, value) {
                //TODO: Handle namespaces in version 5.0
                //TODO: handle the case of no namespace?
                var splitKey = fieldKey.split(':');
                var nameSpace = splitKey[0];
                var keyNoNameSpace = splitKey[1];
                fieldKey[keyNoNameSpace] = value[fieldKey];
                //console.log('value[fieldKey]='+value[fieldKey]);
                //TODO: solve design solution problem, what if the value isn't an object?
                // option A) Assume parents __namespace?
                // option B) Create a value property?
                // option C) create a sibling property that holds the namespace, key = keyNoNameSpace + NAMESPACE_PROP
                value[keyNoNameSpace] = value[fieldKey];
                value[keyNoNameSpace][NAMESPACE_PROP] = nameSpace;
                delete value[fieldKey];
            }

            function recurseJson(json) {
                _.each(json, function(value, key) {
                    if (_.isObject(value)) {
                        for (var fieldKey in computableFields) {
                            if (computableFields.hasOwnProperty(fieldKey) && value[fieldKey]) {
                                var newVal = value[fieldKey];
                                if (computableFields[fieldKey] == 'Date') {
                                    newVal = Date.parse(newVal);
                                }
                                if (computableFields[fieldKey] == 'Double') {
                                    newVal = new mongo.Double(newVal);
                                }
                                if (computableFields[fieldKey] == 'Long') {
                                    newVal = new mongo.Long(newVal);
                                }
                                //TODO: support xml primitive types: http://www.w3.org/TR/xmlschema11-2/#built-in-primitive-datatypes
                                value[fieldKey] = newVal;

                            }
                        }
                        recurseJson(value);
                    }
                    //TODO: Handle namespaces in version 5.0
                    //namespaceToProperty(key, value);
                });
            }

            recurseJson(json);
            return json;
        },

        insertedResponseFieldsToString: function insertedResponseFieldsToString(docObj) {
            if (docObj.document) {
                if (_.isObject(docObj.document.id))
                    docObj.document.id = docObj.document.id.toHexString();
                if (_.isObject(docObj.document.uploadDate))
                    docObj.document.uploadDate = docObj.document.uploadDate.toISOString();
            }
            return docObj;
        },

        jsonToXML: function(json) {
            return xotree.writeXML(json);
            /* Code to enhance that will pull out the NAMESPACE_PROP and prepend the names space
            * based on vcommons\xml\js-ObjTree.js */

           /* const XML_DECL = '<?xml version="1.0" encoding="UTF-8" ?>';
            const ATTR_PREFIX = '-';

            function hash_to_xml( name, tree ) {
                var elem = [];
                var attr = [];
                for( var key in tree ) {
                    if ( ! tree.hasOwnProperty(key) ) continue;
                    //TODO: prepend NAMESPACE_PROP to val, create mocha tests
                    var val = tree[key];
                    if ( key.charAt(0) != ATTR_PREFIX ) {
                        if ( typeof(val) == "undefined" || val == null ) {
                            elem[elem.length] = "<"+key+" />";
                        } else if ( typeof(val) == "object" && val.constructor == Array ) {
                            elem[elem.length] = array_to_xml( key, val );
                        } else if ( typeof(val) == "object" ) {
                            elem[elem.length] = hash_to_xml( key, val );
                        } else {
                            elem[elem.length] = scalar_to_xml( key, val );
                        }
                    } else {
                        attr[attr.length] = " "+(key.substring(1))+'="'+(xml_escape( val ))+'"';
                    }
                }
                var jattr = attr.join("");
                var jelem = elem.join("");
                if ( typeof(name) == "undefined" || name == null ) {
                    // no tag
                } else if ( elem.length > 0 ) {
                    if ( jelem.match( /\n/ )) {
                        jelem = "<"+name+jattr+">"+jelem+"</"+name+">";
                    } else {
                        jelem = "<"+name+jattr+">"  +jelem+"</"+name+">";
                    }
                } else {
                    jelem = "<"+name+jattr+" />";
                }
                return jelem;
            }

            function array_to_xml( name, array ) {
                var out = [];
                for( var i=0; i<array.length; i++ ) {
                    var val = array[i];
                    if ( typeof(val) == "undefined" || val == null ) {
                        out[out.length] = "<"+name+" />";
                    } else if ( typeof(val) == "object" && val.constructor == Array ) {
                        out[out.length] = array_to_xml( name, val );
                    } else if ( typeof(val) == "object" ) {
                        out[out.length] = hash_to_xml( name, val );
                    } else {
                        out[out.length] = scalar_to_xml( name, val );
                    }
                }
                return out.join("");
            }

            function scalar_to_xml( name, text ) {
                if ( name == "#text" ) {
                    return xml_escape(text);
                } else {
                    return "<"+name+">"+xml_escape(text)+"</"+name+">";
                }
            }

            function xml_escape( text ) {
                return String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
            }
            */
            //return XML_DECL + hash_to_xml(null, json); //TODO: 5.0 use custom jsonToXML above
        }
    };
};
