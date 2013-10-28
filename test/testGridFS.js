/**
 * @author David Vazquez
 */

var should = require('should'),
    supertest = require('supertest');


var server = 'localhost:3001';
var mountPoint = '/ecrud/v1/core';
var collection = mountPoint + '/fs';

var request = supertest(server);
var docId;
var docUploadDate;

describe('Create in ' + collection, function () {
	it('should return status of 201.', function (done) {
		request.post(collection)
			.set('Content-Type', 'multipart/form-data')
			.set('Accept', 'application/json')
			.attach('file', 'test/attachments/test.pdf')
			.expect(201)
			.end(function (err, res) {
				if (err) return done(err);
				res.body.should.have.property('file');
				var file = res.body.file;
				file.should.have.property('id');
				file.should.have.property('lastModified');
				file.should.have.property('path', 'test.pdf');
				file.should.have.property('type', 'application/pdf');
				docId = res.body.file.id;
				docUploadDate = res.body.file.lastModified;
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
