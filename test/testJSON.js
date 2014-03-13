/**
 * @author David Vazquez
 */

var should = require('should'), supertest = require('supertest');
var async = require('async');

var server = 'localhost:3001';
var mountPoint = '/ecrud/v1/core';
var collection = mountPoint + '/testJSON';

var request = supertest(server);
var libtest = require("./libtest.js")(request);

(function (){ //immediate function to separate variable scopes of some tests

var docUploadDate = null;
var docID = null;
var decoratedDocID = null;

describe('Create in ' + collection, function() {
    it('should return status of 201.', function(done) {
        request.post(collection).set('Content-Type', 'application/json').set('Accept', 'application/json').send({
            testDoc: {
                value: 1
            }
        }).expect(201).end(function(err, res) {
                if (err)
                    return done(err);
                res.body.should.have.property('document');
                var document = res.body.document;
                document.should.have.property('id');
                document.should.have.property('uploadDate');
                document.should.have.property('path');
                decoratedDocID = res.body.document.id;
                docID = libtest.getHexFromDecoratedID(decoratedDocID);

                docUploadDate = res.body.document.uploadDate;

                //Prevent deletes from occurring before reads and updates
                async.series([
                    doTestsWithDocument,
                    doDeleteTestsOnDocument
                ]);

                done();
            });
    });
});

function doTestsWithDocument(complete){

describe('Get all from ' + collection, function() {
    it('should return status of 200.', function(done) {
        request.get(collection).set('Accept', 'application/json').expect(200).end(function(err, res) {
            if (err)
                return done(err);
            res.body.should.be.instanceOf(Array);
            res.body.should.have.length(1);
            var document = res.body[0];
            document.should.have.property('_id', decoratedDocID);
            document.should.have.property('uploadDate', docUploadDate);
            document.should.have.property('testDoc');
            var testDoc = document.testDoc;
            testDoc.should.have.property('value', 1);
            done();
        });
    });
});

describe('Get from ' + collection, function() {
    it('should return status of 200.', function(done) {
        request.get(collection + '/' + docID).set('Accept', 'application/json').expect(200).end(function(err, res) {
            if (err)
                return done(err);
            var document = res.body;
            document.should.have.property('_id', decoratedDocID);
            document.should.have.property('uploadDate', docUploadDate);
            document.should.have.property('testDoc');
            var testDoc = document.testDoc;
            testDoc.should.have.property('value', 1);
            done();
        });
    });
});

describe('Create with existing ID in ' + collection, function() {
    it('should return status of 500.', function(done) {
        request.post(collection).set('Content-Type', 'application/json').set('Accept', 'application/json').send({
            _id: docID,
            testDoc: {
                value: 3
            }
        }).expect(500).end(function(err, res) {
                if (err)
                    return done(err);
                done();
            });
    });
});

describe('Update in ' + collection, function() {
    it('should return status of 201.', function(done) {
        request.put(collection + '/' + docID).set('Content-Type', 'application/json').set('Accept', 'application/json')
            .send({
                testDoc: {
                    value: 2
                }
            }).expect(201).end(function(err, res) {
                if (err)
                    return done(err);
                res.body.should.have.property('document');
                var document = res.body.document;
                document.should.have.property('id');
                document.should.have.property('uploadDate');
                document.should.have.property('path');
                decoratedDocID = res.body.document.id;
                docID = libtest.getHexFromDecoratedID(decoratedDocID);
                docUploadDate = res.body.document.uploadDate;
                describe('Get after update from ' + collection, function() {
                    it('should return status of 200.', function(done) {
                        request.get(collection + '/' + docID).set('Accept', 'application/json').expect(200).end(function(err, res) {
                            if (err)
                                return done(err);
                            var document = res.body;
                            document.should.have.property('_id', decoratedDocID);
                            document.should.have.property('uploadDate', docUploadDate);
                            document.should.have.property('testDoc');
                            var testDoc = document.testDoc;
                            testDoc.should.have.property('value', 2);
                            //doDeleteTestsOnDocument();
                            complete();
                            done();
                        });
                    });
                });
                done();
            });
    });
});



}

function doDeleteTestsOnDocument(complete) {

describe('Delete from ' + collection, function() {
    it('should return status of 200.', function(done) {
        request.del(collection + '/' + docID)
            .set('Accept', 'application/json')
            .expect(200, function getAfterDel(){
                describe('Get after delete from ' + collection, function() {
                    it('should return status of 404.', function(done) {
                        request.get(collection + '/' + docID).set('Accept', 'application/json').expect(404, done);
                        complete();
                    });
                });
                done();
        });
    });
});

}

}());

(function (){
var docID = null;
var docUploadDate = null;
describe('Create with custom ID in ' + collection, function() {
    it('should return status of 201.', function(done) {
        var docWithCustID = {
                                _id: '27',
                                testDoc: {
                                    value: 1
                                }
                            };
        request.post(collection).set('Content-Type', 'application/json').set('Accept', 'application/json')
            .send(docWithCustID).expect(201).end(function(err, res) {
                if (err)
                    return done(err);
                res.body.should.have.property('document');
                var document = res.body.document;
                document.should.have.property('id', '27');
                document.should.have.property('uploadDate');
                document.should.have.property('path');
                docID = res.body.document.id;
                docUploadDate = res.body.document.uploadDate;
                done();
            });
    });
});

describe('Get with custom ID from ' + collection, function() {
    it('should return status of 200.', function(done) {
        request.get(collection + '/' + docID).set('Accept', 'application/json').expect(200).end(function(err, res) {
            if (err)
                return done(err);
            var document = res.body;
            document.should.have.property('_id', docID);
            document.should.have.property('uploadDate', docUploadDate);
            document.should.have.property('testDoc');
            var testDoc = document.testDoc;
            testDoc.should.have.property('value', 1);
            done();
        });
    });
});

describe('Delete with custome ID from ' + collection, function() {
    it('should return status of 200.', function(done) {
        request.del(collection + '/' + docID).set('Accept', 'application/json').expect(200, done);
    });
});

describe('Get with custome ID after delete from ' + collection, function() {
    it('should return status of 404.', function(done) {
        request.get(collection + '/' + docID).set('Accept', 'application/json').expect(404, done);
    });
});

describe('Create with invalid custom ID in ' + collection, function() {
    it('should return status of 201.', function(done) {
        request.post(collection).set('Content-Type', 'application/json').set('Accept', 'application/json').send({
            _id: 27,
            testDoc: {
                value: 1
            }
        }).expect(500).end(function(err, res) {
                if (err)
                    return done(err);
                done();
            });
    });
});

})();
