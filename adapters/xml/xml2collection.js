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
            var readstream = multipart.gridform.gridfsStream(db, mongo).createReadStream(req.files.file.id);
            var gfs = Grid(db, mongo);
            readstream.on('open', function() {
                var strict = true, 
                    saxStream = require("sax").createStream(strict);

                var xmlStr = '<?xml version="1.0" encoding="UTF-8"?>';
                var lastOpenTag = '';
                var attachmentStarted = false;

                var xmlScheme = getXmlScheme();
                if (!xmlScheme)
                    return;
                
                var attachmentTags = config.transform.xmlTags[xmlScheme].attachment;
                var docTags = config.transform.xmlTags[xmlScheme].doc;

                var attachmentI = -1;
                var attachStreams = [];

                saxStream.on("opentag", function(tag) {
                    if (attachmentStarted)
                        return;
                    lastOpenTag = tag.name;
                    //console.log(tag.name);
                    if (S(lastOpenTag.toLowerCase()).contains(attachmentTags.base64.toLowerCase())) {
                        attachmentStarted = true;
                        attachmentI++;
                        attachStreams[attachmentI] = gfs.createWriteStream( { mode : 'w', root : 'fs' } );
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
                        console.log("aI="+attachmentI+" TL= "+text.length);
                        attachStreams[attachmentI].write(text);
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
                    
                    for (var i = 0; i < attachStreams.length; i++) {
                        var tempId = attachStreams[i].id;
                        attachStreams[i].end();

                        var writeDecodedStream = gfs.createWriteStream( { mode: 'w', root: 'fs' });
                        writeDecodedStream._store.filename = jsonAttachments[i][attachmentTags.fileName];
                        writeDecodedStream.options.content_type = jsonAttachments[i][attachmentTags.contentType];
                        jsonAttachments[i][attachmentTags.gridFSId] = writeDecodedStream.id;
                        
                        var readStreamEncoded = gfsGetReadStream(tempId);
                        //console.log(readStreamEncoded);
                        readStreamEncoded.pipe(base64.decode()).pipe(writeDecodedStream._store);

                        writeDecodedStream.end();
                        console.log('tempId='+tempId);
                        //gfsRemove(tempId); //TODO: make gfsRemove work, doesn't currently remove the file...
                        readStreamEncoded = null;
                        writeDecodedStream = null;
                    }
                    
                    function gfsGetReadStream(fileId) {
                        return gfs.createReadStream( { id: fileId, root: 'fs' } );
                    }
                    
                    function gfsRemove(fileId) {
                        gfs.remove( { _id: fileId, root: 'fs' }, function (err) {
                            if (err) return handleError(err);
                            console.log('Deleted temp gridFS file: '+fileId);
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
                    res.send('{"Error": "404 - ' + xmlSchemeHeader + ': ' + xmlScheme + ' is not supported"}', 404);
                    return;
                }
                return xmlScheme;
            }
            
            
        }
    };
}; 