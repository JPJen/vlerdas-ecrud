/**
 * @author David Vazquez
 */

var should = require('should'),
    supertest = require('supertest');


var server = 'localhost:3001';
var mountPoint = '/ecrud/v1/core';
var collection = mountPoint + '/test';

var request = supertest(server);
var docId;
var docUploadDate;

describe('Create in ' + collection, function () {
	it('should return status of 201.', function (done) {
		request.post(collection)
			.set('Content-Type', 'application/xml')
			.set('Accept', 'application/json')
			.send('<testDoc><value>1</value></testDoc>')
			.expect(201)
			.end(function (err, res) {
				if (err) return done(err);
				res.body.should.have.property('document');
				var document = res.body.document;
				document.should.have.property('id');
				document.should.have.property('uploadDate');
				document.should.have.property('path');
				docId = res.body.document.id;
				docUploadDate = res.body.document.uploadDate;
				done();
			});
	});
});

describe('Get all from ' + collection, function () {
	it('should return status of 200.', function (done) {
		request.get(collection)
			.set('Accept', 'application/json')
			.expect(200)
			.end(function (err, res) {
				if (err) return done(err);
				res.body.should.be.instanceof(Array);
				res.body.should.have.length(1);
				var document = res.body[0];
				document.should.have.property('_id', docId);
				document.should.have.property('uploadDate', docUploadDate);
				document.should.have.property('testDoc');
				var testDoc = document.testDoc;
				testDoc.should.have.property('value', '1');
				done();
			});
	});
});

describe('Get from ' + collection, function () {
	it('should return status of 200.', function (done) {
		request.get(collection + '/' + docId)
			.set('Accept', 'application/json')
			.expect(200)
			.end(function (err, res) {
				if (err) return done(err);
				var document = res.body;
				document.should.have.property('_id', docId);
				document.should.have.property('uploadDate', docUploadDate);
				document.should.have.property('testDoc');
				var testDoc = document.testDoc;
				testDoc.should.have.property('value', '1');
				done();
			});
	});
});

describe('Update in ' + collection, function() {
	it('should return status of 201.', function (done) {
		request.put(collection + '/' + docId)
			.set('Content-Type', 'application/xml')
			.set('Accept', 'application/json')
			.send('<testDoc><value>2</value></testDoc>')
			.expect(201)
			.end(function (err, res) {
				if (err) return done(err);
				res.body.should.have.property('document');
				var document = res.body.document;
				document.should.have.property('id');
				document.should.have.property('uploadDate');
				document.should.have.property('path');
				docId = res.body.document.id;
				docUploadDate = res.body.document.uploadDate;
				done();
			});
	});
});

describe('Get after update from ' + collection, function () {
	it('should return status of 200.', function (done) {
		request.get(collection + '/' + docId)
			.set('Accept', 'application/json')
			.expect(200)
			.end(function (err, res) {
				if (err) return done(err);
				var document = res.body;
				document.should.have.property('_id', docId);
				document.should.have.property('uploadDate', docUploadDate);
				document.should.have.property('testDoc');
				var testDoc = document.testDoc;
				testDoc.should.have.property('value', '2');
				done();
			});
	});
});

describe('Delete from ' + collection, function() {
	it('should return status of 200.', function (done) {
		request.del(collection + '/' + docId)
			.set('Accept', 'application/json')
			.expect(200, done);
	});
});

describe('Get from ' + collection, function() {
	it('should return status of 404.', function(done) {
		request.get(collection + '/' + docId)
			.set('Accept', 'application/json')
			.expect(404, done);
	});
});

describe('Create empty in ' + collection, function() {
	it('should return status of 400.', function(done) {
		request.post(collection)
			.set('Content-Type', 'application/xml')
			.set('Accept', 'application/json')
			.send('')
			.expect(400)
			.end(function (err, res) {
				if (err) return done(err);
				done();
			});
	});
});