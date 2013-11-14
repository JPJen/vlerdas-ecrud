/**
 * Entry point for the RESTFul Service. Provides CRUD operations on a database.
 *
 * Created by: Julian Jewel
 *
 */
var express = require('express')
var multipart = require('connect-multipart-gridform')

var app = module.exports.app = express();

var app = express();

app.configure(function() {
    app.set('views', __dirname + '/views');
    app.use('/images/', express.static(__dirname + '/images/'));
    app.use(express.logger());

});

app
    .get(
    '/:db/:collection/transformForm',
    function(req, res) {
        res.header('Content-Type', 'text/html')
        res
            .send('<center><img src="/images/vler_das_transform.gif"/></center><center><form action="http://localhost:3001/ecrud/v1/'
                + req.params.db
                + '/'
                + req.params.collection
                + '/transform" method="post" enctype="multipart/form-data">'
                + '<input type="file" name="file">'
                + '<input type="submit" value="Upload">' + '</form></center>');
    });

app
    .get(
    '/:db/fs/uploadForm',
    function(req, res) {
        res
            .send('<center><img src="/images/vler_das_upload.gif"/></center><center><form action="http://localhost:3001/ecrud/v1/'
                + req.params.db
                + '/fs" method="post" enctype="multipart/form-data">'
                + '<input type="file" name="file" mulitple="multiple">'
                + '<input type="submit" value="Upload">'
                + '</form></center>');
    });

app
    .get(
    '/:db/:collection/searchForm',
    function(req, res) {
        res.header('Content-Type', 'text/html')
        res
            .send('<center><img src="/images/vler_das_search.gif"/></center><center><form action="http://localhost:3001/ecrud/v1/'
                + req.params.db
                + '/'
                + req.params.collection
                + '/search" method="get" enctype="text/html">'
                + '<input type="text" name="text">' + '<input type="submit" value="Search">' + '</form></center>');
    });

app
    .get(
    '/:db/fs/uploadJson',
    function(req, res) {
        res
            .send('<center><img src="/images/vler_das_upload.gif"/></center><center><form action="http://localhost:3001/ecrud/v1/'
                + req.params.db
                + '/fs" method="post" enctype="multipart/form-data">'
                + '<input type="file" name="file; type=application/json" mulitple="multiple">'
                + '<input type="submit" value="Upload">' + '</form></center>');
    });

app.listen('9000', 'localhost', function() {
    console.log('eCRUD Demo server listening on port ' + '9000');
});
