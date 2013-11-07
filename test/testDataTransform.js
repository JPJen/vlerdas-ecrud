/**
 * @author Moroni Pickering
 */

var fs = require('fs');
UTIL = {};
UTIL.XML = require('vcommons').objTree;
var xotree = new UTIL.XML.ObjTree();
var should = require('should'),
    supertest = require('supertest');
var Jsonpath = require('JSONPath');
require('datejs'); //makes Date.parse handle many more string formats

var mockConfig = { computableFields : { 'nc:DateTime' : 'Date' } };
var dataTransform = require("../lib/dataTransform.js")(mockConfig);


describe('test dataTransform.toComputableJSON', function(){
    it('respond with computable json', function(done){
        fs.readFile("test/attachments/DBQ_AnkleCondition.xml", 'utf8', function (err, data) {
            var jsonFromXML = xotree.parseXML(data);
            var jsonTransformed = dataTransform.toComputableJSON(jsonFromXML);
            
            var jsonDateTime = Jsonpath.eval(jsonTransformed, '$..nc:DateTime');
            console.log("*********"+jsonDateTime)
            jsonDateTime[0].should.not.equal('2013-10-13T19:05:52-04:00');
            jsonDateTime[0].should.equal('2013-10-13T23:05:52.000Z');
            done();
        });
    });
});


