/**
 * @author Moroni Pickering
 */

var supertest = require('supertest');
var request = supertest('localhost:3001');
var libtest = require("./libtest.js")(request);
var Jsonpath = require('JSONPath');
var fs = require('fs');

var collectionName = 'eCFT';
describe(collectionName + ' POST', function() {
    it('a file', function(done) {
        request.post('/ecrud/v1/core/' + collectionName + '/transform')
            .set('Content-Desc', 'niem/xml')
            .set('Content-Type', 'application/xml')
            .attach('file', 'test/attachments/eCFTCaseFile_minimal.xml')
            .end(function(err, res) {
                res.should.have.status(201);
                // 'created' success
                // status

                res.text.should.include("nc:Document");
                res.text.should.include("nc:DocumentFileControlID");
                res.text.should.include("nc:DocumentFormatText");
                var json = JSON.parse(res.text);
                var transformCollectionId = json[0]._id;
                libtest.checkGET_Collection(collectionName, transformCollectionId, 200);
                libtest.checkDELETE_Collection(collectionName, transformCollectionId, 200);
                libtest.checkGET_Collection(collectionName, transformCollectionId, 404);

                var orginalGridFSDocId = Jsonpath.eval(json, '$..nc:DocumentFileControlID');
                libtest.checkGET_GridFSDoc(orginalGridFSDocId, 200);
                libtest.checkDELETE_GridFSDoc(orginalGridFSDocId, 200);
                libtest.checkGET_GridFSDoc(orginalGridFSDocId, 404);

                var jsonAttachments = Jsonpath.eval(json, '$..nc:Attachment')[0];
                for (var i = 0; i < jsonAttachments.length; i++) {
                    var attachmentGridFSId = jsonAttachments[i]['nc:BinaryLocationURI'];
                    libtest.checkGET_GridFSDoc(attachmentGridFSId, 200);
                    libtest.checkDELETE_GridFSDoc(attachmentGridFSId, 200);
                    libtest.checkGET_GridFSDoc(attachmentGridFSId, 404);
                }
                jsonAttachments.length.should.equal(2);

                res.text.should.not.include("BinaryBase64Object");
                done();
            });
    });
});

describe(collectionName + ' POST', function() {
    it('Header w/ Content-Desc: unicorn/xml', function(done) {
        request.post('/ecrud/v1/core/' + collectionName + '/transform')
            .set('Content-Desc', 'unicorn/xml')
            .attach('file', 'test/attachments/eCFTCaseFile_minimal.xml')
            .expect(415, done);
    });
});

var fileUTF8_WithBOM = "VLERDoc-UTF8wBOM.xml";
// BOM = utf8 Byte Order Mark
describe(collectionName + ' POST', function() {
    it('Transform utf8 w/ Byte Order Mark', function(done) {
        request.post('/ecrud/v1/core/' + collectionName + '/transform')
            .attach('file', 'test/attachments/' + fileUTF8_WithBOM)
            .expect(201, done);
    });
});

collectionName = 'DBQ';
describe(collectionName + ' POST', function() {
    it('a file', function(done) {
        request.post('/ecrud/v1/core/' + collectionName + '/transform')
            .attach('file', 'test/attachments/DBQ_AnkleCondition.xml')
            .end(function(err, res) {
                res.should.have.status(201);
                // 'created' success status

                res.text.should.include("nc:Document");
                res.text.should.include("nc:DocumentFileControlID");
                res.text.should.include("nc:DocumentFormatText");
                var json = JSON.parse(res.text);
                var transformCollectionId = json[0]._id;
                libtest.checkXmlDocIds(collectionName, transformCollectionId, json);
                libtest.checkGET_Collection(collectionName, transformCollectionId, 200);
                libtest.checkDELETE_Collection(collectionName, transformCollectionId, 200);
                libtest.checkGET_Collection(collectionName, transformCollectionId, 404);

                var orginalGridFSDocId = Jsonpath.eval(json, '$..nc:DocumentFileControlID');
                libtest.checkGET_GridFSDoc(orginalGridFSDocId, 200);
                libtest.checkDELETE_GridFSDoc(orginalGridFSDocId, 200);
                libtest.checkGET_GridFSDoc(orginalGridFSDocId, 404);

                var jsonAttachments = Jsonpath.eval(json, '$..nc:Attachment');
                for (var i = 0; i < jsonAttachments.length; i++) {
                    var attachmentGridFSId = jsonAttachments[i]['nc:BinaryLocationURI'];
                    libtest.checkGET_GridFSDoc(attachmentGridFSId, 200);
                    libtest.checkDELETE_GridFSDoc(attachmentGridFSId, 200);
                    libtest.checkGET_GridFSDoc(attachmentGridFSId, 404);
                }
                jsonAttachments.length.should.equal(1);

                res.text.should.not.include("BinaryBase64Object");
                done();
            });
    });
});

var fileBadXml = "bad.xml";
describe(collectionName + ' POST', function() {
    it('Test bad XML document', function(done) {
        request.post('/ecrud/v1/core/' + collectionName + '/transform')
            .attach('file', 'test/attachments/' + fileBadXml)
            .expect(400, done);
    });
});

describe(collectionName + ' POST', function() {
    it('Test Error when NOT name="file" ', function(done) {
        request.post('/ecrud/v1/core/' + collectionName + '/transform')
            .attach('name!=file', 'test/attachments/' + fileUTF8_WithBOM)
            .expect(400, done);
    });
});

describe(collectionName + ' POST', function() {
    it('Test Error invalid attachment content type ', function(done) {
        request.post('/ecrud/v1/core/' + collectionName + '/transform')
            .attach('file', 'test/attachments/afile.bunk')
            .expect(415, done);
    });
});

//MAX_BUFFER_LENGTH
describe(collectionName + ' POST', function() {
    it('Test Error invalid attachment content type ', function(done) {
        request.post('/ecrud/v1/core/' + collectionName + '/transform')
            .attach('file', 'test/attachments/afile.bunk')
            .expect(415, done);
    });
});

checkAttachmentBase64Decoded('eCFTembedMoroni_1K_Test.xml', 'Moroni_1K_Test.txt', '1K base64');
checkAttachmentBase64Decoded('eCFT1MBAttachEmbeded.xml', 'eCFT1MBAttach.xml', '1MB base64');
checkAttachmentBase64Decoded('eCFTCaseFile - XRay.xml', 'ChestXRay.jpg', 'ChestXRay base64', true);
checkAttachmentBase64Decoded('eCFTCaseFile - AnkleXRay.xml', 'AnkleXRay.jpg', 'AnkleXRay base64', true);

function checkAttachmentBase64Decoded(postFileName, attachFileName, desc, doWholeCompare) {
    var collectionName = 'eCFT';
    describe(desc + ' POST Attachment base64 decode', function() {
        it('expect xml', function(done) {
            request.post('/ecrud/v1/core/' + collectionName + '/transform')
                .attach('file', 'test/attachments/' + postFileName)
                .end(function(err, res) {
                    res.should.have.status(201);

                    var json = JSON.parse(res.text);
                    libtest.checkDELETE_Collection(collectionName, json[0]._id, 200, desc);

                    var orginalGridFSDocId = Jsonpath.eval(json, '$..nc:DocumentFileControlID');
                    libtest.checkDELETE_GridFSDoc(orginalGridFSDocId, 200, desc);

                    var jsonAttachments = Jsonpath.eval(json, '$..nc:Attachment')[0];
                    //console.log(jsonAttachments);
                    var attachmentGridFSId = jsonAttachments['nc:BinaryLocationURI'];

                    describe(desc + ' GET base64 decoded attachment', function() {
                        it('respond with decoded xml', function(done) {
                            request.get('/ecrud/v1/core/fs/' + attachmentGridFSId).end(function(err, res) {
                                res.should.have.status(200);
                                libtest.checkDELETE_GridFSDoc(attachmentGridFSId, 200, desc);
                                var compareFileName = "test/attachments/" + attachFileName;
                                var compareData = fs.readFileSync(compareFileName, 'utf8');
                                if (doWholeCompare) {
                                    res.text.should.equal(compareData); //fills up output for large files...
                                } else {
                                    res.text.slice(0, 20).should.equal(compareData.slice(0, 20)); //compare start
                                    res.text.slice(-20).should.equal(compareData.slice(-20)); //compare end
                                }
                                done();
                            });
                            //done();
                        });
                    });

                    done();
                });
        });
    });
}

// TODO: test with very large generated XML file, L&P testing

// ------- Functions -------

