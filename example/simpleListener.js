var redis = require("redis"), client = redis.createClient(), sub = redis.createClient();

// Subscription Test
sub.on("subscribe", function(channel, count) {
});

sub.on("message", function(channel, message) {
    console.log("Published Message on Client channel " + channel + ": " + message);
});

sub.incr("Started Listener");
sub.subscribe("core.6379");

function callback(err, evt) {
    if (evt) {
	console.log("Evicted from Queue:" + evt);
	client.blpop("core.6379", '0', callback);
    }
}

client.blpop("core.6379", '0', callback);
