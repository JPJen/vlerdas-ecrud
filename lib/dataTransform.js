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
        },

        jsonToXML: function(json) {
            /* Code to enhance that will pull out the NAMESPACE_PROP and prepend the names space
            * taken from vcommons\xml\js-ObjTree.js */

            this.writeXML = function ( tree ) {
                var xml = this.hash_to_xml( null, tree );
                return this.xmlDecl + xml;
            };

            this.hash_to_xml = function ( name, tree ) {
                var elem = [];
                var attr = [];
                for( var key in tree ) {
                    if ( ! tree.hasOwnProperty(key) ) continue;
                    var val = tree[key];
                    if ( key.charAt(0) != this.attr_prefix ) {
                        if ( typeof(val) == "undefined" || val == null ) {
                            elem[elem.length] = "<"+key+" />";
                        } else if ( typeof(val) == "object" && val.constructor == Array ) {
                            elem[elem.length] = this.array_to_xml( key, val );
                        } else if ( typeof(val) == "object" ) {
                            elem[elem.length] = this.hash_to_xml( key, val );
                        } else {
                            elem[elem.length] = this.scalar_to_xml( key, val );
                        }
                    } else {
                        attr[attr.length] = " "+(key.substring(1))+'="'+(this.xml_escape( val ))+'"';
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
                    jelem = "<"+name+jattr+" />";
                }
                return jelem;
            };

            this.array_to_xml = function ( name, array ) {
                var out = [];
                for( var i=0; i<array.length; i++ ) {
                    var val = array[i];
                    if ( typeof(val) == "undefined" || val == null ) {
                        out[out.length] = "<"+name+" />";
                    } else if ( typeof(val) == "object" && val.constructor == Array ) {
                        out[out.length] = this.array_to_xml( name, val );
                    } else if ( typeof(val) == "object" ) {
                        out[out.length] = this.hash_to_xml( name, val );
                    } else {
                        out[out.length] = this.scalar_to_xml( name, val );
                    }
                }
                return out.join("");
            };

            this.scalar_to_xml = function ( name, text ) {
                if ( name == "#text" ) {
                    return this.xml_escape(text);
                } else {
                    return "<"+name+">"+this.xml_escape(text)+"</"+name+">";
                }
            };

            this.xml_escape = function ( text ) {
                return String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
            };

            return this.writeXML(json);
        }
    };
};
