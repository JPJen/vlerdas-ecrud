/**
 * @author Moroni Pickering
 */

var should = require('should'), supertest = require('supertest');
var request = supertest('localhost:3001');
var libtest = require("./libtest.js")(request);
var Jsonpath = require('JSONPath');

var collectionName = 'eCFT';
describe(
    collectionName + ' POST',
    function() {
	it(
	    'a file',
	    function(done) {
		request
		    .post('/ecrud/v1/core/' + collectionName + '/transform')
		    .set('Content-Desc', 'niem/xml')
		    .set('Content-Type', 'application/xml')
		    .attach('file', 'test/attachments/eCFTCaseFile_minimal.xml')
		    .end(
			function(err, res) {
			    res.should.have.status(201); // 'created' success
			    // status

			    res.text.should.include("nc:Document");
			    res.text.should.include("nc:DocumentFileControlID");
			    res.text.should.include("nc:DocumentFormatText");
			    json = JSON.parse(res.text);
			    libtest.checkGET_Collection(collectionName, transformCollectionId = json[0]._id, 200);
			    libtest.checkDELETE_Collection(collectionName, transformCollectionId = json[0]._id, 200);
			    libtest.checkGET_Collection(collectionName, transformCollectionId = json[0]._id, 404);

			    orginalGridFSDocId = json[0]['case:ElectronicCaseFile']['case:CommonData']['nc:Document']['nc:DocumentFileControlID'];
			    libtest.checkGET_GridFSDoc(orginalGridFSDocId, 200);
			    libtest.checkDELETE_GridFSDoc(orginalGridFSDocId, 200);
			    libtest.checkGET_GridFSDoc(orginalGridFSDocId, 404);

			    var jsonAttachments = Jsonpath.eval(json, '$..nc:Attachment')[0];
			    for ( var i = 0; i < jsonAttachments.length; i++) {
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
	request.post('/ecrud/v1/core/' + collectionName + '/transform').set('Content-Desc', 'unicorn/xml').attach(
	    'file', 'test/attachments/eCFTCaseFile_minimal.xml').expect(415, done);
    });
});

var fileUTF8_WithBOM = "VLERDoc-UTF8wBOM.xml"; // BOM = utf8 Byte Order Mark
describe(collectionName + ' POST', function() {
    it('Transform utf8 w/ Byte Order Mark', function(done) {
	request.post('/ecrud/v1/core/' + collectionName + '/transform').attach('file',
	    'test/attachments/' + fileUTF8_WithBOM).expect(201, done);
    });
});

var collectionName = 'DBQ';
describe(collectionName + ' POST', function() {
    it('a file', function(done) {
	request.post('/ecrud/v1/core/' + collectionName + '/transform').attach('file',
	    'test/attachments/DBQ_AnkleCondition.xml').end(function(err, res) {
	    res.should.have.status(201); // 'created' success status

	    res.text.should.include("nc:Document");
	    res.text.should.include("nc:DocumentFileControlID");
	    res.text.should.include("nc:DocumentFormatText");
	    json = JSON.parse(res.text);
	    libtest.checkXmlDocIds(collectionName, transformCollectionId = json[0]._id, json);
	    libtest.checkGET_Collection(collectionName, transformCollectionId = json[0]._id, 200);
	    libtest.checkDELETE_Collection(collectionName, transformCollectionId = json[0]._id, 200);
	    libtest.checkGET_Collection(collectionName, transformCollectionId = json[0]._id, 404);

	    orginalGridFSDocId = json[0]['cld:Claim']['cld:CommonData']['nc:Document']['nc:DocumentFileControlID'];
	    libtest.checkGET_GridFSDoc(orginalGridFSDocId, 200);
	    libtest.checkDELETE_GridFSDoc(orginalGridFSDocId, 200);
	    libtest.checkGET_GridFSDoc(orginalGridFSDocId, 404);

	    var jsonAttachments = Jsonpath.eval(json, '$..nc:Attachment');
	    for ( var i = 0; i < jsonAttachments.length; i++) {
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
	    .attach('file', 'test/attachments/' + fileBadXml).expect(400, done);
    });
});

describe(collectionName + ' POST', function() {
    it('Test Error when NOT name="file" ', function(done) {
	request.post('/ecrud/v1/core/' + collectionName + '/transform').attach('name!=file',
	    'test/attachments/' + fileUTF8_WithBOM).expect(400, done);
    });
});

describe(collectionName + ' POST', function() {
    it('Test Error invalid attachment content type ', function(done) {
	request.post('/ecrud/v1/core/' + collectionName + '/transform').attach('file', 'test/attachments/afile.bunk')
	    .expect(415, done);
    });
});

// ------- Functions -------

// TODO: test with very large generated XML file

