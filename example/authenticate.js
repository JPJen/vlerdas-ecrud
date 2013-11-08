var http = require('http');
var Ofuda = require('ofuda');

var ofuda = new Ofuda({
    headerPrefix : 'Amz',
    hash : 'sha1',
    serviceLabel : 'AWS',
    debug : true
});

var credentials = {
    accessKeyId : 'testuser2',
    accessKeySecret : 'pa$$w0rd2'
};

http_options = {
    host : 'localhost',
    port : 3001,
    path : '/core/test',
    method : 'GET',
    headers : {}
};

signedOptions = ofuda.signHttpRequest(credentials, http_options);
console.log(JSON.stringify(signedOptions));

var req = http.request(signedOptions, function(res) {
    console.log('STATUS: ' + res.statusCode);
    console.log('HEADERS: ' + JSON.stringify(res.headers));
    res.pipe(process.stdout);
});

req.on("error", function(err) {
    console.error(err);
});

req.end();

console.log('sent message');