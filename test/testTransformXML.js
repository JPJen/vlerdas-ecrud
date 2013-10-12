/**
 * @author Moroni Pickering
 */

var should = require('should'),
    supertest = require('supertest');
var request = supertest('localhost:3001');

describe('upload', function() {
    it('a file', function(done) {
       request.post('/core/eCFT/transform')
           .attach('file', 'test/attachments/eCFTCaseFile_minimal.xml')
           .end(function(err, res) {
               res.should.have.status(201); // 'created' success status
               
               res.text.should.include("nc:Document");
               res.text.should.include("nc:DocumentFileControlID");
               res.text.should.include("nc:DocumentFormatText");
               
               res.text.should.not.include("BinaryBase64Object");
               done();
           });
    });
});

describe('GET /core/fs', function(){
  it('respond with json', function(done){
    request
      .get('/core/fs')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
      //TODO: assert that the transformed file exists
      //TODO: download file, compare with uploaded file
  });
});


describe('GET /core/eCFT', function(){
  it('respond with json', function(done){
    request
      .get('/core/eCFT')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
      //TODO: assert that the parsed collection exists
  });
});

//TODO: test with very large generated XML file

