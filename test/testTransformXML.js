/**
 * @author Moroni Pickering
 */

var should = require('should'),
    supertest = require('supertest');
var request = supertest('localhost:3001');
var Jsonpath = require('JSONPath');

var collectionName = 'eCFT';
describe(collectionName+' POST', function() {
    it('a file', function(done) {
       request.post('/core/'+collectionName+'/transform')
           .attach('file', 'test/attachments/eCFTCaseFile_minimal.xml')
           .end(function(err, res) {
               res.should.have.status(201); // 'created' success status
               
               res.text.should.include("nc:Document");
               res.text.should.include("nc:DocumentFileControlID");
               res.text.should.include("nc:DocumentFormatText");
               json = JSON.parse(res.text);
               checkGET_Collection(collectionName, transformCollectionId = json[0]._id, 200);
               checkDELETE_Collection(collectionName, transformCollectionId = json[0]._id, 200);
               checkGET_Collection(collectionName, transformCollectionId = json[0]._id, 404);
               
               orginalGridFSDocId = json[0]['case:ElectronicCaseFile']['case:CommonData']['nc:Document']['nc:DocumentFileControlID'];
               checkGET_GridFSDoc(orginalGridFSDocId, 200);
               checkDELETE_GridFSDoc(orginalGridFSDocId, 200);
               checkGET_GridFSDoc(orginalGridFSDocId, 404);
               
               var jsonAttachments = Jsonpath.eval(json, '$..nc:Attachment');
               for (var i = 0; i < jsonAttachments.length; i++) {
                   var attachmentGridFSId = jsonAttachments[i]['nc:BinaryLocationURI'];
                   checkGET_GridFSDoc(attachmentGridFSId, 200);
                   checkDELETE_GridFSDoc(attachmentGridFSId, 200);
                   checkGET_GridFSDoc(attachmentGridFSId, 404);
               }
               jsonAttachments.length.should.equal(2);
               
               res.text.should.not.include("BinaryBase64Object");
               done();
           });
    });
});

var collectionName = 'DBQ';
describe(collectionName+' POST', function() {
    it('a file', function(done) {
       request.post('/core/'+collectionName+'/transform')
           .attach('file', 'test/attachments/DBQ_AnkleCondition.xml')
           .end(function(err, res) {
               res.should.have.status(201); // 'created' success status
               
               res.text.should.include("nc:Document");
               res.text.should.include("nc:DocumentFileControlID");
               res.text.should.include("nc:DocumentFormatText");
               json = JSON.parse(res.text);
               checkGET_Collection(collectionName, transformCollectionId = json[0]._id, 200);
               checkDELETE_Collection(collectionName, transformCollectionId = json[0]._id, 200);
               checkGET_Collection(collectionName, transformCollectionId = json[0]._id, 404);
               
               orginalGridFSDocId = json[0]['cld:Claim']['cld:CommonData']['nc:Document']['nc:DocumentFileControlID'];
               checkGET_GridFSDoc(orginalGridFSDocId, 200);
               checkDELETE_GridFSDoc(orginalGridFSDocId, 200);
               checkGET_GridFSDoc(orginalGridFSDocId, 404);
               
               var jsonAttachments = Jsonpath.eval(json, '$..nc:Attachment');
               for (var i = 0; i < jsonAttachments.length; i++) {
                   var attachmentGridFSId = jsonAttachments[i]['nc:BinaryLocationURI'];
                   checkGET_GridFSDoc(attachmentGridFSId, 200);
                   checkDELETE_GridFSDoc(attachmentGridFSId, 200);
                   checkGET_GridFSDoc(attachmentGridFSId, 404);
               }
               jsonAttachments.length.should.equal(1);
               
               res.text.should.not.include("BinaryBase64Object");
               done();
           });
    });
});

//------- Functions ------- 

function checkGET_GridFSDoc(gridFSDocId, httpCode) {
    describe('GET /core/fs/'+gridFSDocId, function(){
      it('respond with json', function(done){
        request
          .get('/core/fs/'+gridFSDocId)
          .expect(httpCode, done);
      });
    });
}

function checkGET_Collection(collectionName, collectionId, httpCode) {
    describe('GET /core/'+collectionName+'/'+collectionId, function(){
      it('respond with json', function(done){
        request
          .get('/core/'+collectionName+'/'+collectionId)
//          .set('Accept', 'application/json')
//          .expect('Content-Type', /json/)
          .expect(httpCode, done);
      });
    });
}

function checkDELETE_GridFSDoc(gridFSDocId, httpCode) {
    describe('DELETE /core/fs/'+gridFSDocId, function(){
      it('respond with json', function(done){
        request
          .del('/core/fs/'+gridFSDocId)
          .expect(httpCode, done);
      });
    });
}

function checkDELETE_Collection(collectionName, collectionId, httpCode) {
    describe('DELETE /core/'+collectionName+'/'+collectionId, function(){
      it('respond with json', function(done){
        request
          .del('/core/'+collectionName+'/'+collectionId)
          .expect(httpCode, done);
      });
    });
}



//TODO: test with very large generated XML file

