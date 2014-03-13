/**
 * @author Moroni Pickering
 */
UTIL = {};
UTIL.XML = require('vcommons').objTree;
var xotree = new UTIL.XML.ObjTree();
var Jsonpath = require('JSONPath');

module.exports = exports = function(request) {
    return {
        getHexFromDecoratedID: function getHexFromDecoratedID(decoratedID) {
            var a = /\$ObjectID\((.*)\)/.exec(decoratedID);
            if (a) {
                return a[1];
            }
            return decoratedID;
        },
        checkDELETE_GridFSDoc: function(gridFSDocId, httpCode, desc) {
            gridFSDocId = this.getHexFromDecoratedID(gridFSDocId);
            describe(desc + 'DELETE /ecrud/v1/core/fs/' + gridFSDocId, function() {
                it('respond with json', function(done) {
                    request.del('/ecrud/v1/core/fs/' + gridFSDocId).expect(httpCode, done);
                });
            });
        },
        checkGET_GridFSDoc: function(gridFSDocId, httpCode, desc) {
            gridFSDocId = this.getHexFromDecoratedID(gridFSDocId);
            describe(desc + 'GET /ecrud/v1/core/fs/' + gridFSDocId, function() {
                it('respond with json', function(done) {
                    request.get('/ecrud/v1/core/fs/' + gridFSDocId).expect(httpCode, done);
                });
            });
        },
        checkGET_Collection: function(collectionName, collectionId, httpCode, desc) {
            collectionId = this.getHexFromDecoratedID(collectionId);
            describe(desc + 'GET /ecrud/v1/core/' + collectionName + '/' + collectionId, function() {
                it('respond with json', function(done) {
                    request.get('/ecrud/v1/core/' + collectionName + '/' + collectionId)
                        // .set('Accept', 'application/json')
                        // .expect('Content-Type', /json/)
                        .expect(httpCode, done);
                });
            });
        },
        checkDELETE_Collection: function(collectionName, collectionId, httpCode, desc) {
            collectionId = this.getHexFromDecoratedID(collectionId);
            describe(desc + 'DELETE /ecrud/v1/core/' + collectionName + '/' + collectionId, function() {
                it('respond with json', function(done) {
                    request.del('/ecrud/v1/core/' + collectionName + '/' + collectionId).expect(httpCode, done);
                });
            });
        },
        checkXmlDocIds: function(collectionName, collectionId, json, desc) {
            collectionId = this.getHexFromDecoratedID(collectionId);
            describe(desc + 'GET /ecrud/v1/core/' + collectionName + '/' + collectionId, function() {
                it('XML check ids', function(done) {
                    request.get('/ecrud/v1/core/' + collectionName + '/' + collectionId).
                            set('Accept', 'application/xml').end(function(err, res) {
                        var jsonFromXML = xotree.parseXML(res.text);
                        var attachmentsFromXML = Jsonpath.eval(jsonFromXML, '$..nc:Attachment');
                        var attachments = Jsonpath.eval(json, '$..nc:Attachment');
                        attachmentsFromXML[0]['nc:BinaryLocationURI'].should.equal(attachments[0]['nc:BinaryLocationURI']);

                        var docFromXML = Jsonpath.eval(jsonFromXML, '$..nc:Document');
                        var doc = Jsonpath.eval(json, '$..nc:Document');
                        docFromXML[0]['nc:DocumentFileControlID'].should.equal(doc[0]['nc:DocumentFileControlID']);

                        collectionId.should.equal(jsonFromXML.document._id);
                        done();
                    });
                });
            });
        }
    };
};
