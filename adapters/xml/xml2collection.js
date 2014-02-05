/**
 * @author Moroni Pickering
 */

// Initialize ObjTree library for XML/JSON Conversion
UTIL = {};
UTIL.XML = require('vcommons').objTree;
var S = require('string');
var xotree = new UTIL.XML.ObjTree();
var multipart = require('connect-multipart-gridform');
var Grid = require('gridfs-stream');
var Jsonpath = require('JSONPath');
var base64 = require('base64-stream');
var config = require('config');
var logger = require('vcommons').log.getLogger('eCrud', config.log);
var cluster = require('cluster');

module.exports = exports = function() {
    return {
        transform: function(req, res, next, db, mongo, config, event) {
            logger.trace('xml2collection.transform - start' + (cluster.worker ? ' - worker #' + cluster.worker.id : ''));
            var gfs = Grid(db, mongo);

            var xmlScheme = getXmlScheme();
            if (!xmlScheme)
                return;

            var store = new mongo.GridStore(db, req.files.file.id, '', 'r');
            store.open(function(err, gs) {
                readstream = gs.stream();

            // , {
            // encoding:
            // 'utf8'
            // }

                var strict = true;
                var saxStream = require("sax").createStream(strict);
                //saxStream.MAX_BUFFER_LENGTH = 32 * 1024; //this has no effect

                var xmlStr = '';
                // '<?xml version="1.0" encoding="UTF-8"?>';
                var lastOpenTag = '';
                var attachmentStarted = false;

                var attachmentTags = config.transform['xmlTags'][xmlScheme].attachment;
                var docTags = config.transform['xmlTags'][xmlScheme].doc;

                var attachmentI = -1;
                var attachStreamsTemp = [];

                saxStream.on("opentag", function(tag) {
                    if (attachmentStarted)
                        return;
                    lastOpenTag = tag.name;
                    // console.log(tag.name);
                    if (S(lastOpenTag.toLowerCase()).contains(attachmentTags.base64.toLowerCase())) {
                        attachmentStarted = true;
                        attachmentI++;
                        attachStreamsTemp[attachmentI] = gfs.createWriteStream({
                            mode: 'w',
                            root: 'fs'
                        });
                    }
                    xmlStr += "<" + tag.name;
                    for (var attribName in tag.attributes) {
                        if (tag.attributes.hasOwnProperty(attribName))
                            xmlStr += " " + attribName + "=\"" + tag.attributes[attribName] + "\"";
                    }
                    xmlStr += ">";
                    // console.log(xmlStr);
                });

                saxStream.on("text", ontext);
                saxStream.on("doctype", ontext);
                var txtRemain = "";
                //Must decode text in "chunks" that are divisible by 4
                var chunkSize = 16 * 1024;

                function ontext(text) {
                    if (S(lastOpenTag.toLowerCase()).contains(attachmentTags.base64.toLowerCase())) {
                        //console.log("aI=" + attachmentI + " TL= " + text.length);
                        do {
                            txtRemain = txtRemain + text;
                            if (txtRemain.length > chunkSize) {
                                var txtBuf = txtRemain.slice(0, chunkSize);
                                txtRemain = txtRemain.slice(chunkSize, txtRemain.length);
                            } else {
                                var txtBuf = txtRemain;
                                txtRemain = '';
                            }
                            var buf = new Buffer(txtBuf, 'base64');
                            //if (attachmentI == 0) console.log(buf);

                            attachStreamsTemp[attachmentI].write(buf);
                            text = '';
                        } while (txtRemain.length > chunkSize);
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

                saxStream.on("end", function() {
                    var json = xotree.parseXML(xmlStr);
                    var jsonDoc = Jsonpath.eval(json, '$..' + docTags.name);
                    jsonDoc[0][docTags['gridFSId']] = req.files.file.id.toHexString();
                    jsonDoc[0][docTags['contentType']] = req.files.file.type;

                    // set attachment(s) properties, close/end each attachments
                    // write streams
                    var jsonAttachments = Jsonpath.eval(json, '$..' + attachmentTags.name);
                    if (jsonAttachments[0][0])// only support 1 attachments section for now
                        jsonAttachments = jsonAttachments[0];
                    // console.log(jsonAttachments);
                    if (attachStreamsTemp.length > 0) {
                        for (var i = 0; i < attachStreamsTemp.length; i++) {
                            attachStreamsTemp[i]._store.filename = jsonAttachments[i][attachmentTags.fileName];
                            attachStreamsTemp[i].options.content_type = jsonAttachments[i][attachmentTags.contentType];
                            jsonAttachments[i][attachmentTags['gridFSId']] = attachStreamsTemp[i].id.toHexString();
                            attachStreamsTemp[i].end();
                        }
                    }
                    //var dataTransform = require('../../lib/dataTransform.js')(config);
                    //json = dataTransform.toComputableJSON(json);
                    writeToCollection(json);
                });

                saxStream.on("error", function(err) {
                    console.error("error!", err);
                    res.send('{"Error": "400 - XML Parse error: ' + err + '"}', 400);
                });

                // stream transform to strip out the BOM TODO: refactor to a class
                var stream = require('stream');
                var parserStripBOM = new stream.Transform();
                var dataCounter = 0;
                parserStripBOM._transform = function(data, encoding, done) {
                    //console.log('dataCounter: '+dataCounter);
                    if (dataCounter == 0) {
                        // utf8 signature on a utf8 file is 0xef, 0xbb, 0xbf
                        // could try and edit the Buffer directly instead of converting to string
                        // but this was faster to implement at the moment...
                        data = data.toString('utf8');
                        var firstChar = data.substring(0, 1);
                        var bomChar = '\uFEFF';
                        // Byte Order Mark character
                        if (firstChar == bomChar) {
                            data = data.substring(1);
                            data = new Buffer(data, 'utf8');
                        }
                    }
                    dataCounter++;
                    this.push(data);
                    done();
                };
                //Tried block-stream instead of custom buffering 4 byte divisors, but saxStream uses its own buffer
                //var BlockStream = require('block-stream');
                //var block = new BlockStream(4, { nopad: true });
                //readstream.pipe(parserStripBOM).pipe(block).pipe(saxStream);
                readstream.pipe(parserStripBOM).pipe(saxStream);
            });
            // **** transform() Functions ****

            /*function gfsRemove(fileId) {
             gfs.remove({ _id: fileId, root: 'fs'}, function(err) {
             if (err)
             return handleError(err);
             console.log('Deleted temp gridFS file: ' + fileId);
             return null;
             });
             }*/

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
                            logger.trace('xml2collection.transform - end' + (cluster.worker ? ' - worker #' + cluster.worker.id : ''));
                            return next();
                        });
                    }
                    return null;
                });
            }

            function getXmlScheme() {
                var xmlSchemeHeader = 'Content-Desc';
                var xmlScheme = req.header(xmlSchemeHeader);
                if (!xmlScheme)
                    xmlScheme = config.transform['xmlTags']['defaultScheme'];
                if (!config.transform['xmlTags'][xmlScheme]) {
                    // gfsRemove(req.files.file.id);
                    res.send('{"Error": "415 - ' + xmlSchemeHeader + ': ' + xmlScheme + ' is not supported"}', 415);
                    return null;
                }
                return xmlScheme;
            }

        }
    };
};
