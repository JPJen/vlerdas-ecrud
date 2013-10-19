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


module.exports = exports = function () {
    return {
        transform: function (req, res, next, db, mongo, config, event) {
    			var readstream = multipart.gridform.gridfsStream(db, mongo).createReadStream(req.files.file.id);
    			readstream.on('open', function () {
    				// Recognise text of any language in any format
                var strict = true,
                    saxStream = require("sax").createStream(strict);
                var gfs = Grid(db, mongo);
                
                var xmlStr = '<?xml version="1.0" encoding="UTF-8"?>';
                var lastOpenTag = '';
                var attachmentStarted = false;

                var xmlSchemeHeader = 'Content-Desc';
                var xmlScheme = req.header(xmlSchemeHeader);
                if (!xmlScheme)
                    xmlScheme = config.transform.xmlTags.defaultScheme;
                if (!config.transform.xmlTags[xmlScheme]) {
                    res.send('{"Error": "404 - '+xmlSchemeHeader+': ' + xmlScheme + ' is not supported"}', 404);
                    return;
                }    
                var attachmentTags = config.transform.xmlTags[xmlScheme].attachment;
                var docTags = config.transform.xmlTags[xmlScheme].doc;
                
                var attachmentI = -1;
                var attachStreams = [];
				
				saxStream.on("opentag", function (tag) {
					if (attachmentStarted) return;
					lastOpenTag = tag.name;
					//console.log(tag.name);
					if (S(lastOpenTag.toLowerCase()).contains(attachmentTags.base64.toLowerCase())){
						attachmentStarted = true;
                        attachmentI++;
                        attachStreams[attachmentI] = gfs.createWriteStream({
                            mode: 'w'
                            //,filename: attachmentI+'attach.txt'
                            ,root: 'fs'
                        });
				    }
					xmlStr += "<"+tag.name;
					for (var i in tag.attributes) {
					  xmlStr += " "+i+"=\""+tag.attributes[i]+"\"";
					}
					xmlStr += ">";
					//console.log(xmlStr);
				});

				saxStream.on("text", ontext);
				saxStream.on("doctype", ontext);

                function ontext (text) {
                    if ( S(lastOpenTag.toLowerCase()).contains(attachmentTags.base64.toLowerCase()) ){
                        attachStreams[attachmentI].write(text);
					} else {
						xmlStr += text;
					}
				}

				saxStream.on("closetag", function (tag) {
				  if (lastOpenTag == tag)
					attachmentStarted = false;
				  if (attachmentStarted) return;
				  xmlStr += "</"+tag+">";
				});

				saxStream.on("cdata", function (data) {
				  xmlStr += "<![CDATA["+data+"]]>";
				});

				saxStream.on("comment", function (comment) {
				  xmlStr += "<!--"+comment+"-->";
				});
				
				saxStream.on("end", function (comment) {
                    json = xotree.parseXML(xmlStr); 
                    var jsonDoc = Jsonpath.eval(json, '$..'+docTags.name);
                    console.log(jsonDoc);
                    console.log(req.files.file.id);
                    jsonDoc[0][docTags.gridFSId] = req.files.file.id;
                    jsonDoc[0][docTags.contentType] = req.files.file.type;
                    
                    //set attachment(s) properties, close/end each attachments write streams
                    var jsonAttachments = Jsonpath.eval(json, '$..'+attachmentTags.name);
                    for (var i = 0; i < attachStreams.length; i++) {
                        attachStreams[i]._store.filename = jsonAttachments[i][attachmentTags.fileName];  
                        jsonAttachments[i][attachmentTags.gridFSId] = attachStreams[i].id;
                        attachStreams[i].options.content_type = jsonAttachments[i][attachmentTags.contentType];
                        //TODO: figure out a solution for base64 decoding
                        //var streamForDecode = gfs.createWriteStream( { mode: 'w', root: 'fs', filename: 'temp_loc_for_decode.dat' });
                        //attachStreams[i].pipe(base64.decode()).pipe(streamForDecode).pipe(attachStreams[i]);
                        attachStreams[i].end();
                        /*gfs.remove({_id: streamForDecode.id}, function (err) {
                          if (err) return handleError(err);
                          console.log('success');
                        });*/
                    }
                    
                    //write extracted/transformed xml to mongo collection
                    db.collection(req.params.collection, function(err, collection) {
                        if (err)
                            return next(err);
                        if (!_.isUndefined(json)) {
                            json.uploadDate = new Date();
                            collection.insert(json, function(err, docs) {
                                if (err)
                                    return next(err);
                                res.locals.items = docs;
                                if (config.notification.eventHandler.enabled)
                                    event.emit("i", config.notification.eventHandler.channel, req.params.collection, docs);
                                return next();
                            });
                        }
                    });
				});
				
				saxStream.on("error", function (err) {
					console.error("error!", err);
					this._parser.error = null;
					this._parser.resume();
				});
				
				readstream.pipe(saxStream);
				
			});
        }
    };
};

