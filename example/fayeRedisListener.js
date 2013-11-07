var http = require('http'), faye = require('faye');
var fayeRedis = require('faye-redis');

var bayeux = new faye.NodeAdapter({
    mount : '/faye',
    timeout : 45,
    engine : {
	type : fayeRedis,
	host : 'localhost',
	port : 6379
    }
});

bayeux.listen(8000);