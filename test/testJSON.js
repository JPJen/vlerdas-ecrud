/**
 * @author David Vazquez
 */

var should = require('should'), supertest = require('supertest');

var server = 'localhost:3001';
var mountPoint = '/ecrud/v1/core';
var collection = mountPoint + '/test';

var request = supertest(server);
var docID;
var docUploadDate;

describe('Create in ' + collection, function() {
    it('should return status of 201.', function(done) {
	request.post(collection).set('Content-Type', 'application/json').set('Accept', 'application/json').send({
	    testDoc : {
		value : 1
	    }
	}).expect(201).end(function(err, res) {
	    if (err)
		return done(err);
	    res.body.should.have.property('document');
	    var document = res.body.document;
	    document.should.have.property('id');
	    document.should.have.property('uploadDate');
	    document.should.have.property('path');
	    docID = res.body.document.id;
	    docUploadDate = res.body.document.uploadDate;
	    done();
	});
    });
});

describe('Get all from ' + collection, function() {
    it('should return status of 200.', function(done) {
	request.get(collection).set('Accept', 'application/json').expect(200).end(function(err, res) {
	    if (err)
		return done(err);
	    res.body.should.be.instanceOf(Array);
	    res.body.should.have.length(1);
	    var document = res.body[0];
	    document.should.have.property('_id', docID);
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
	    document.should.have.property('_id', docID);
	    document.should.have.property('uploadDate', docUploadDate);
	    document.should.have.property('testDoc');
	    var testDoc = document.testDoc;
	    testDoc.should.have.property('value', 1);
	    done();
	});
    });
});

describe('Update in ' + collection, function() {
    it('should return status of 201.', function(done) {
	request.put(collection + '/' + docID).set('Content-Type', 'application/json').set('Accept', 'application/json')
	    .send({
		testDoc : {
		    value : 2
		}
	    }).expect(201).end(function(err, res) {
		if (err)
		    return done(err);
		res.body.should.have.property('document');
		var document = res.body.document;
		document.should.have.property('id');
		document.should.have.property('uploadDate');
		document.should.have.property('path');
		docID = res.body.document.id;
		docUploadDate = res.body.document.uploadDate;
		done();
	    });
    });
});

describe('Get after update from ' + collection, function() {
    it('should return status of 200.', function(done) {
	request.get(collection + '/' + docID).set('Accept', 'application/json').expect(200).end(function(err, res) {
	    if (err)
		return done(err);
	    var document = res.body;
	    document.should.have.property('_id', docID);
	    document.should.have.property('uploadDate', docUploadDate);
	    document.should.have.property('testDoc');
	    var testDoc = document.testDoc;
	    testDoc.should.have.property('value', 2);
	    done();
	});
    });
});

describe('Create with existing ID in ' + collection, function() {
    it('should return status of 500.', function(done) {
	request.post(collection).set('Content-Type', 'application/json').set('Accept', 'application/json').send({
	    _id : docID,
	    testDoc : {
		value : 3
	    }
	}).expect(500).end(function(err, res) {
	    if (err)
		return done(err);
	    done();
	});
    });
});

describe('Delete from ' + collection, function() {
    it('should return status of 200.', function(done) {
	request.del(collection + '/' + docID).set('Accept', 'application/json').expect(200, done);
    });
});

describe('Get after delete from ' + collection, function() {
    it('should return status of 404.', function(done) {
	request.get(collection + '/' + docID).set('Accept', 'application/json').expect(404, done);
    });
});

describe('Create with custom ID in ' + collection, function() {
    it('should return status of 201.', function(done) {
	request.post(collection).set('Content-Type', 'application/json').set('Accept', 'application/json').send({
	    _id : '27',
	    testDoc : {
		value : 1
	    }
	}).expect(201).end(function(err, res) {
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
	    _id : 27,
	    testDoc : {
		value : 1
	    }
	}).expect(500).end(function(err, res) {
	    if (err)
		return done(err);
	    done();
	});
    });
});
