/**
 * @author Moroni Pickering
 */

var S = require('string');
var xotree = new UTIL.XML.ObjTree();

module.exports = exports = function () {
    return {
        transform: function (fsId, readstream, createCollection) {
            var strict = true,
                saxStream = require("sax").createStream(strict);
                //, {lowercasetags: true, trim:true}
            var xmlStr = '<?xml version="1.0" encoding="UTF-8"?>';
            var lastOpenTag = '';
            var attachmentStarted = false;
            var niemNS = "nc:",
                   NS = niemNS;
            var attachmentBase64Tag = NS+"BinaryBase64Object";
            var attachmentLocationTag = NS+"BinaryLocationURI";
            var originalDocIDTag = NS+"DocumentFileControlID";
            var orginalDocFormatTag = NS+"DocumentFormatText";
            var docTag = NS+"Document";
            
            
            saxStream.on("opentag", function (tag) {
                if (attachmentStarted) return;
                lastOpenTag = tag.name;
                //console.log(tag.name);
                if (S(lastOpenTag.toLowerCase()).contains(attachmentBase64Tag.toLowerCase()))
                    attachmentStarted = true;
                xmlStr += "<"+tag.name;
                for (var i in tag.attributes) {
                  xmlStr += " "+i+"=\""+tag.attributes[i]+"\"";
                }
                xmlStr += ">";
                //console.log(xmlStr);
            });

            saxStream.on("text", ontext);
            saxStream.on("doctype", ontext);
            //var onTextI = 0;
            var openTagLinkInside = null;
            function ontext (text) {
                /* Proof that large text peices come in chunks
                onTextI++;
                console.log(lastOpenTag + ', ' + onTextI + ', ' + text.length);
                */
                if ( S(lastOpenTag.toLowerCase()).contains(attachmentBase64Tag.toLowerCase()) ){
                    if (openTagLinkInside != lastOpenTag) {
                        openTagLinkInside = lastOpenTag;
                        //TODO: start GridFS Storage for attachment
                        //newGridStream = createFile()
                        //xmlStr += "<"+attachmentLocationTag+">" + newGridStream.id + "</"+attachmentLocationTag+">";
                    } else {
                        //TODO: store the base64 content in GridFS
                    }
                } else {
                    xmlStr += text;
                }
            }

            saxStream.on("closetag", function (tag) {
              if (lastOpenTag == tag)
                attachmentStarted = false;
              if (attachmentStarted) return;
              //console.log(tag);
              if ( tag.toLowerCase() == docTag.toLowerCase() ) {
                  xmlStr += "<"+originalDocIDTag+">"+fsId+"</"+originalDocIDTag+">";
                  xmlStr += "<"+orginalDocFormatTag+">application/xml</"+orginalDocFormatTag+">";
              }
              xmlStr += "</"+tag+">";
            });

            saxStream.on("cdata", function (data) {
              xmlStr += "<![CDATA["+data+"]]>";
            });

            saxStream.on("comment", function (comment) {
              xmlStr += "<!--"+comment+"-->";
            });

            saxStream.on("end", function (comment) {
              //console.log("xmlStr:" + xmlStr);
              json = xotree.parseXML(xmlStr);
              createCollection(json);
              //console.log("xmlStr-JSON:" + JSON.stringify(json));
              //console.log("gridFS ID: "+fsId);
            });
            
            saxStream.on("error", function (err) {
                console.error("error!", err);
                this._parser.error = null;
                this._parser.resume();
            });
            
            readstream.pipe(saxStream);
        }
    };
};

