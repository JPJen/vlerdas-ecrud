/**
 * @author Moroni Pickering
 */

var fs = require('fs');
UTIL = {};
UTIL.XML = require('vcommons').objTree;
var xotree = new UTIL.XML.ObjTree();
var should = require('should'), supertest = require('supertest');
var request = supertest('localhost:3001');
var libtest = require("./libtest.js")(request);
var Jsonpath = require('JSONPath');
require('datejs');
//makes Date.parse handle many more string formats

var mockConfig = {
    transform: {
        xmlTags: {
            "niem/xml" : {
                computableFields: {
                    'nc:DateTime': 'Date',
                    'nc:Date': 'Date'
                }
            }
        }
    }
};
var dataTransform = require("../lib/dataTransform.js")(mockConfig);

describe('test dataTransform.toComputableJSON', function() {
    it('respond with computable json', function(done) {
        fs.readFile("test/attachments/DBQ_AnkleCondition.xml", 'utf8', function(err, data) {
            var jsonFromXML = xotree.parseXML(data);
            var jsonTransformed = dataTransform.toComputableJSON(jsonFromXML);
            var jsonDateTime = Jsonpath.eval(jsonTransformed, '$..nc:DateTime');
            jsonDateTime[0].should.not.equal('2013-10-13T19:05:52-04:00');
            jsonDateTime[0].toISOString().should.equal('2013-10-13T22:05:52.000Z');
            //jsonDateTime[0]['_namespace'].should.equal('nc'); //not until 5.0

            var jsonDateTime = Jsonpath.eval(jsonTransformed, '$..nc:Date');
            jsonDateTime[0].should.not.equal('1978-07-05');
            jsonDateTime[0].toISOString().should.equal('1978-07-05T06:00:00.000Z');
            //jsonDateTime[0]['_namespace'].should.equal('nc'); //not until 5.0
            done();
        });
    });
});

describe('test dataTransform.jsonToXML', function() {
    it('input json, respond with xml', function(done) {
        fs.readFile("test/attachments/DBQ_AnkleCondition.xml", 'utf8', function(err, data) {
            var xotreeXML = xotree.writeXML(data);
            //backToXML.should.equal(data);
            //var jsonTransformed = dataTransform.toComputableJSON(jsonFromXML);
            var dataTransformXML = dataTransform.jsonToXML(data);
            //TODO: assert things...
            xotreeXML.should.equal(dataTransformXML);
            done();
        });
    });
});

var dateRight = new Date();

var jsonString = "{\
    \"dateBadDecoration\":\"Date(02-06-2015)\",\
    \"dateWrongFormat\":\"$Date(zfhq)\",\
    \"dateRight\":\"$Date(" + dateRight.toISOString() + ")\",\
    \"oID\":\"$ObjectID(5304e8f274cbcda039000111)\",\
    \"oIDBadDecoration\":\"$ObjectID(5304e8f274cbcda039000111\",\
    \"oIDWrongFormat\":\"$ObjectID(000)\"\
}";

var collectionName = 'computeCollection';
describe(collectionName + ' POST', function() {
    it('JSON String', function(done) {
        request.post('/ecrud/v1/core/' + collectionName)
            .set('Content-Type', 'application/json')
            .send(jsonString)
            .end(function(err, res) {
                res.should.have.status(201);
                var json = JSON.parse(res.text);
                var collectionId = libtest.getHexFromDecoratedID(json.document.id);
                request.get('/ecrud/v1/core/' + collectionName + '/' + collectionId).end(function(err, res) {
                    var jsonColl = JSON.parse(res.text);

                    jsonColl["dateBadDecoration"].should.equal("Date(02-06-2015)");
                    jsonColl["dateWrongFormat"].should.equal("$Date(zfhq)");
                    jsonColl["dateRight"].should.equal("$Date(" + dateRight.toISOString() + ")");

                    jsonColl["oID"].should.equal("$ObjectID(5304e8f274cbcda039000111)");
                    jsonColl["oIDBadDecoration"].should.equal("$ObjectID(5304e8f274cbcda039000111");
                    jsonColl["oIDWrongFormat"].should.equal("$ObjectID(000)");

                    libtest.checkDELETE_Collection(collectionName, collectionId, 200);
                    done();
                });
            });
    });
});