/**
 * @author Moroni Pickering
 */

// Initialize ObjTree library for XML/JSON Conversion
UTIL = {};
UTIL.XML = require('vcommons').objTree;
var S = require('string');
var xotree = new UTIL.XML.ObjTree();
var Jsonpath = require('JSONPath');
var base64 = require('base64-stream');
var config = require('config');
var logger = require('vcommons').log.getLogger('eCrud', config.log);
var cluster = require('cluster');
var fs = require('fs');
var GridFSWriteStream = require('../../lib/gridFSWriteStream').GridFSWriteStream;
var sax = require('sax');
var _ = require('underscore');

module.exports = exports = function(options) {
    return {
        transform: function(part, callback) {
            logger.enter('xml2collection.transform - start' + (cluster.worker ? ' - worker #' + cluster.worker.id : ''));
            var readstream = part;
            var gfsOptions = {
                db: options.db,
                mongo: options.mongo,
                filename: part.filename,
                content_type: part.headers['content-type'],
                mode: 'w',
                root: 'fs',
                highWaterMark: options.highWaterMark
            };
            var writestream = new GridFSWriteStream(gfsOptions);

            var xmlScheme = getXmlScheme();
            if (!xmlScheme)
                return;

            // , {
            // encoding:
            // 'utf8'
            // }

            var strict = !_.isUndefined(options.strict) ? options.strict : true;
            var saxStream = sax.createStream(strict);

            //saxStream.MAX_BUFFER_LENGTH = 32 * 1024; //this has no effect

            var xmlStr = '';
            // '<?xml version="1.0" encoding="UTF-8"?>';
            var lastOpenTag = '';
            var attachmentStarted = false;

            var attachmentTags = options[xmlScheme].attachment;
            var docTags = options[xmlScheme].doc;

            var attachmentI = -1;
            var attachStreamsTemp = [];

            saxStream.on("opentag", function(tag) {
                logger.detail('opentag ' + tag.name);
                if (attachmentStarted)
                    return;
                lastOpenTag = tag.name;
                // console.log(tag.name);
                if (S(lastOpenTag.toLowerCase()).contains(attachmentTags.base64.toLowerCase())) {
                    attachmentStarted = true;
                    attachmentI++;
                    attachStreamsTemp[attachmentI] = new GridFSWriteStream({
                        db: options.db,
                        mongo: options.mongo,
                        mode: 'w',
                        root: 'fs'
                    });
                    attachStreamsTemp[attachmentI].once('finish', function() {
                        logger.detail('attachStreams[' + attachmentI + '] finished');
                    });
                }
                xmlStr += "<" + tag.name;
                for (var attribName in tag.attributes) {
                    if (tag.attributes.hasOwnProperty(attribName))
                        xmlStr += " " + attribName + "=\"" + escapeXML(tag.attributes[attribName]) + "\"";
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
                    xmlStr += escapeXML(text);
                }
            }


            saxStream.on("closetag", function(tag) {
                logger.detail('closetag ' + tag);
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

            saxStream.once("end", function() {
                logger.detail('saxstream finished');
                part.id = writestream.id;
                if (xmlStr !== null) {
                    var json = xotree.parseXML(xmlStr);
                    var jsonDoc = Jsonpath.eval(json, '$..' + docTags.name);
                    jsonDoc[0][docTags['gridFSId']] = part.id.toHexString();
                    jsonDoc[0][docTags['contentType']] = part.headers['content-type'];

                    // set attachment(s) properties, close/end each attachments
                    // write streams
                    var jsonAttachments = Jsonpath.eval(json, '$..' + attachmentTags.name);
                    if (jsonAttachments[0][0])// only support 1 attachments section for now
                        jsonAttachments = jsonAttachments[0];
                    // console.log(jsonAttachments);
                    if (attachStreamsTemp.length > 0) {
                        for (var i = 0; i < attachStreamsTemp.length; i++) {
                            attachStreamsTemp[i]._gridStore.filename = jsonAttachments[i][attachmentTags.fileName];
                            attachStreamsTemp[i].options.content_type = jsonAttachments[i][attachmentTags.contentType];
                            jsonAttachments[i][attachmentTags['gridFSId']] = attachStreamsTemp[i].id.toHexString();
                            attachStreamsTemp[i].end();
                        }
                    }

                    //var dataTransform = require('../../lib/dataTransform.js')(config);
                    //json = dataTransform.toComputableJSON(json);
                    writeToCollection(json);
                }
            });

            saxStream.once("error", function(err) {
                logger.error('Error parsing xml: ' + err);
                if (xmlStr !== null) {
                    // blank out xmlStr to keep end event from doing anything.
                    xmlStr = null;
                    logger.enter('xml2collection.transform - end' + (cluster.worker ? ' - worker #' + cluster.worker.id : ''));
                    callback('{"Error": "400 - XML Parse error: ' + err + '"}');
                }
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

            readstream.once('end', function() {
                logger.detail('readstream ended');
            });

            writestream.once('finish', function() {
                logger.detail('writestream finished');
            });

            //Tried block-stream instead of custom buffering 4 byte divisors, but saxStream uses its own buffer
            //var BlockStream = require('block-stream');
            //var block = new BlockStream(4, { nopad: true });
            //readstream.pipe(parserStripBOM).pipe(block).pipe(saxStream);
            readstream.pipe(writestream);
            readstream.pipe(parserStripBOM).pipe(saxStream);
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
                options.db.collection(part.collection, function(err, collection) {
                    if (err) {
                        callback(err);
                    } else if (!_.isUndefined(json)) {
                        json.uploadDate = new Date();
                        collection.insert(json, function(err, docs) {
                            logger.enter('xml2collection.transform - end' + (cluster.worker ? ' - worker #' + cluster.worker.id : ''));
                            callback(err, docs);
                        });
                    }
                });
            }

            function getXmlScheme() {
                var xmlSchemeHeader = 'Content-Desc';
                var xmlScheme = part.headers[xmlSchemeHeader];
                if (!xmlScheme)
                    xmlScheme = options['defaultScheme'];
                if (!options[xmlScheme]) {
                    // gfsRemove(req.files.file.id);
                    callback('{"Error": "415 - ' + xmlSchemeHeader + ': ' + xmlScheme + ' is not supported"}');
                    return null;
                }
                return xmlScheme;
            }
        }
    };
};

//  This should go in vcommons...
var XML_CHAR_MAP = {
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&apos;'
};

function escapeXML(s) {
    return s.replace(/[<>&"']/g, function(ch) {
        return XML_CHAR_MAP[ch];
    });
}
