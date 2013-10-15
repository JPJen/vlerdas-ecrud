/**
 * @author Moroni Pickering
 */

var should = require('should'),
    supertest = require('supertest');
var request = supertest('localhost:3001');

describe('eCFT POST', function() {
    it('a file', function(done) {
       request.post('/core/eCFT/transform')
           .attach('file', 'test/attachments/eCFTCaseFile_minimal.xml')
           .end(function(err, res) {
               res.should.have.status(201); // 'created' success status
               
               res.text.should.include("nc:Document");
               res.text.should.include("nc:DocumentFileControlID");
               res.text.should.include("nc:DocumentFormatText");
               json = JSON.parse(res.text);
               checkGET_CollectionExists(transformCollectionId = json[0]._id);
               orginalGridFSDocId = json[0]['case:ElectronicCaseFile']['case:CommonData']['nc:Document']['nc:DocumentFileControlID'];
               checkGET_GridFSDocExists(orginalGridFSDocId);
               
               res.text.should.not.include("BinaryBase64Object");
               done();
           });
    });
});

describe('DBQ POST', function() {
    it('a file', function(done) {
       request.post('/core/eCFT/transform')
           .attach('file', 'test/attachments/DBQ_AnkleCondition.xml')
           .end(function(err, res) {
               res.should.have.status(201); // 'created' success status
               
               res.text.should.include("nc:Document");
               res.text.should.include("nc:DocumentFileControlID");
               res.text.should.include("nc:DocumentFormatText");
               json = JSON.parse(res.text);
               checkGET_CollectionExists(transformCollectionId = json[0]._id);
               orginalGridFSDocId = json[0]['cld:Claim']['cld:CommonData']['nc:Document']['nc:DocumentFileControlID'];
               checkGET_GridFSDocExists(orginalGridFSDocId);
               
               res.text.should.not.include("BinaryBase64Object");
               done();
           });
    });
});

//------- Functions ------- 

function checkGET_GridFSDocExists(gridFSDocId) {
    console.log("gridFSDocId: "+gridFSDocId);
    describe('GET /core/fs/:gridFSDocId', function(){
      it('respond with json', function(done){
        request
          .get('/core/fs/'+gridFSDocId)
          .expect(200, done);
      });
    });
}

function checkGET_CollectionExists(collectionId) {
    console.log("collectionId: "+collectionId);
    describe('GET /core/eCFT/:collectionId', function(){
      it('respond with json', function(done){
        request
          .get('/core/eCFT/'+collectionId)
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200, done);
      });
    });
}

//TODO: test with very large generated XML file

