/**
 * @author Moroni Pickering
 */

// Initialize ObjTree library for XML/JSON Conversion
UTIL = {};
UTIL.XML = require('../../node_modules/vcommons/xml/js-ObjTree');
var S = require('string');
var xotree = new UTIL.XML.ObjTree();
var multipart = require('connect-multipart-gridform');
var Grid = require('gridfs-stream');
var Jsonpath = require('JSONPath');
var base64 = require('base64-stream');


module.exports = exports = function() {
    return {
        transform : function(req, res, next, db, mongo, config, event) {
            var gfs = Grid(db, mongo);
            var xmlScheme = getXmlScheme();
            if (!xmlScheme)
                return;
            var readstream = multipart.gridform.gridfsStream(db, mongo).createReadStream(req.files.file.id); //, { encoding: 'utf8' }
            //readstream._store.setEncoding('utf8');
            //console.log(readstream);
            readstream.on('open', function() {
                
                var strict = true, 
                    saxStream = require("sax").createStream(strict);

                var xmlStr = '';//'<?xml version="1.0" encoding="UTF-8"?>';
                var lastOpenTag = '';
                var attachmentStarted = false;

                var attachmentTags = config.transform.xmlTags[xmlScheme].attachment;
                var docTags = config.transform.xmlTags[xmlScheme].doc;

                var attachmentI = -1;
                var attachStreamsTemp = [];

                saxStream.on("opentag", function(tag) {
                    if (attachmentStarted)
                        return;
                    lastOpenTag = tag.name;
                    //console.log(tag.name);
                    if (S(lastOpenTag.toLowerCase()).contains(attachmentTags.base64.toLowerCase())) {
                        attachmentStarted = true;
                        attachmentI++;
                        attachStreamsTemp[attachmentI] = gfs.createWriteStream( { mode : 'w', root : 'fs' } );
                    }
                    xmlStr += "<" + tag.name;
                    for (var i in tag.attributes) {
                        xmlStr += " " + i + "=\"" + tag.attributes[i] + "\"";
                    }
                    xmlStr += ">";
                    //console.log(xmlStr);
                });

                saxStream.on("text", ontext);
                saxStream.on("doctype", ontext);
                function ontext(text) {
                    if (S(lastOpenTag.toLowerCase()).contains(attachmentTags.base64.toLowerCase())) {
                        //console.log("aI="+attachmentI+" TL= "+text.length);
                        attachStreamsTemp[attachmentI].write(text);
                    } else {
                        xmlStr += text;
                    }
                }

                saxStream.on("closetag", function(tag) {
                    if (lastOpenTag == tag)
                        attachmentStarted = false;
                    if (attachmentStarted)
                        return;
                    xmlStr += "</" + tag + ">";
                });

                saxStream.on("cdata", function(data) {
                    xmlStr += "<![CDATA[" + data + "]]>";
                });

                saxStream.on("comment", function(comment) {
                    xmlStr += "<!--" + comment + "-->";
                });

                saxStream.on("end", function(comment) {
                    json = xotree.parseXML(xmlStr);
                    var jsonDoc = Jsonpath.eval(json, '$..' + docTags.name);
                    jsonDoc[0][docTags.gridFSId] = req.files.file.id;
                    jsonDoc[0][docTags.contentType] = req.files.file.type;

                    //set attachment(s) properties, close/end each attachments write streams
                    var jsonAttachments = Jsonpath.eval(json, '$..' + attachmentTags.name);
                    if (jsonAttachments[0][0]) //only support 1 attachments section for now
                        jsonAttachments = jsonAttachments[0];
                    //console.log(jsonAttachments);
                    for (var i = 0; i < attachStreamsTemp.length; i++) {
                        var tempId = attachStreamsTemp[i].id;

                        var decodedWriteStream = gfs.createWriteStream( { mode: 'w', root: 'fs' } );
                        var permId = decodedWriteStream.id;
                        decodedWriteStream._store.filename = jsonAttachments[i][attachmentTags.fileName];
                        decodedWriteStream.options.content_type = jsonAttachments[i][attachmentTags.contentType];
                        
                        jsonAttachments[i][attachmentTags.gridFSId] = permId;

                        decodeAttachment(tempId, permId, attachStreamsTemp[i], decodedWriteStream);
                        attachStreamsTemp[i].end();
                    }
                    
                    function decodeAttachment(tempId, permId, attachStream, decodedWriteStream) {
                        /*  WARNING: the order and method of ending the streams, calling in this
                         *          function matters. Took over a full day to get the correct temp
                         *          stream to write to the correct permanant stream.
                         *          And then delete the temp gridFS files correctly.
                         *          So be ware if you change this up.
                         *          TODO: Should create mocha tests to verify the correct file sizes on return
                         *          TODO: and that the temp files have been deleted  
                         */ 
                        attachStream.on('close', function(file) {
                            var readStreamEncoded = gfs.createReadStream( { _id: tempId, root: 'fs' } );
                            readStreamEncoded.on('open', function() {
                                readStreamEncoded.pipe(base64.decode()).pipe(decodedWriteStream._store);
                                decodedWriteStream.end();
                                gfsRemove(tempId);
                            });
                        });
                    }
                    
                    writeToCollection(json);
                });

                saxStream.on("error", function(err) {
                    console.error("error!", err);
                    this._parser.error = null;
                    this._parser.resume();
                });

                readstream.pipe(saxStream);

            });
            
            //**** transform() Functions ****
            
            function gfsRemove(fileId) {
                gfs.remove( { _id: fileId, root: 'fs' }, function (err) {
                    if (err) return handleError(err);
                    console.log('Deleted temp gridFS file: '+fileId);
                });
            }
            
            function writeToCollection(json) {
                db.collection(req.params.collection, function(err, collection) {
                    if (err)
                        return next(err);
                    if (!_.isUndefined(json)) {
                        json.uploadDate = new Date();
                        collection.insert(json, function(err, docs) {
                            if (err)
                                return next(err);
                            res.locals.items = docs;
                            res.locals.docs = docs;
                            event.emit("i", req, res);
                            return next();
                        });
                    }
                });
            }
            
            function getXmlScheme() {
                var xmlSchemeHeader = 'Content-Desc';
                var xmlScheme = req.header(xmlSchemeHeader);
                if (!xmlScheme)
                    xmlScheme = config.transform.xmlTags.defaultScheme;
                if (!config.transform.xmlTags[xmlScheme]) {
                    gfsRemove(req.files.file.id); 
                    res.send('{"Error": "404 - ' + xmlSchemeHeader + ': ' + xmlScheme + ' is not supported"}', 404);
                    return;
                }
                return xmlScheme;
            }
            
        }
        
    };
}; 