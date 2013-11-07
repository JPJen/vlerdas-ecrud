var http = require('http'), faye = require('faye');
var redis = require("redis"), sub = redis.createClient();

sub.incr("Started Listener");
sub.subscribe("core.collection");

var bayeux = new faye.NodeAdapter({
    mount : '/faye',
    timeout : 45
});
bayeux.listen(8000);

sub.on("subscribe", function(channel, count) {
});

sub.on("message", function(channel, message) {
    console.log("Client channel " + channel + ": " + message);
    bayeux.getClient().publish('/core', message);
});
