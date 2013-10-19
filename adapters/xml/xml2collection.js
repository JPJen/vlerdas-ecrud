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
                //TODO: use config file to store and retrieve the tag information
                var niemNS = "nc:",
                       NS = niemNS;
                var xmlScheme = config['transform']['xmlTags']['default'];
                var attachmentBase64Tag = config['transform']['xmlTags'][xmlScheme]['attachment']['base64'];
                var attachmentFileNameTag = NS+"BinaryLocationURI";
                var originalDocIDTag = NS+"DocumentFileControlID";
                var orginalDocFormatTag = NS+"DocumentFormatText";
                var docTag = NS+"Document";
                var attachmentTag = 'nc:Attachment';
                var attachmentGridFSIdTag = 'nc:BinaryLocationURI';
                var attachmentContentType = 'nc:BinaryFormatStandardName';
				
                var attachmentI = -1;
				
				saxStream.on("opentag", function (tag) {
					if (attachmentStarted) return;
					lastOpenTag = tag.name;
					//console.log(tag.name);
					if (S(lastOpenTag.toLowerCase()).contains(attachmentBase64Tag.toLowerCase())){
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
                //var onTextI = 0;
                var openTagLinkInside = null;
                var attachStreams = [];
                function ontext (text) {
                    /* Proof that large text bodies come in chunks
                    onTextI++;
                    console.log(lastOpenTag + ', ' + onTextI + ', ' + text.length);
                    */
                    if ( S(lastOpenTag.toLowerCase()).contains(attachmentBase64Tag.toLowerCase()) ){
                        attachStreams[attachmentI].write(text);
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
					  xmlStr += "<"+originalDocIDTag+">"+req.files.file.id+"</"+originalDocIDTag+">";
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
                    json = xotree.parseXML(xmlStr); 

                    
                    //set attachment(s) properties, close/end each attachments write streams
                    var jsonAttachments = Jsonpath.eval(json, '$..'+attachmentTag);
                    for (var i = 0; i < attachStreams.length; i++) {
                        attachStreams[i]._store.filename = jsonAttachments[i][attachmentFileNameTag];  
                        jsonAttachments[i][attachmentGridFSIdTag] = attachStreams[i].id;
                        attachStreams[i].options.content_type = jsonAttachments[i][attachmentContentType];
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

