var CLog = require('./node-syncognite-util.js');
var XE = require('../node-syncognite.js');

// https://www.npmjs.com/package/twitter
var TW = require('twitter');
// https://github.com/thisandagain/sentiment
var SENTI = require('sentiment');

function twitterSetEntity(entity, property, val, timestamp) {
    var msg= {MsgType:"EntityMsg", Entity: entity, Property: property, Value: val, Time: timestamp};
    XE.ent(msg);
}

var Twitter = function() {};

Twitter.prototype.init = function(md) {
    var client = new TW({
        consumer_key: md['consumer_key'],
        consumer_secret: md['consumer_secret'],
        access_token_key: md['access_token_key'],
        access_token_secret: md['access_token_secret']
    });
    
    var stream = client.stream('statuses/filter', {track: md['Track']});
    stream.on('data', function(event) {
        var entity='twitter'
        var property='tweet'
        var value=event.text
        var timestamp=Date.now()/1000.0
        twitterSetEntity(entity,property,value,timestamp);
        var se=SENTI(event.text);
        var property='sentiment';
        // { score: 0, comparative: 0, tokens: [ 'searles', 'chinese', 'room'], words: [], positive: [], negative: [] }
        var value=se['score'];
        twitterSetEntity(entity,property,value,timestamp);
    });
    
    stream.on('error', function(error) {
        throw error;
    });
    /*
    // You can also get the stream in a callback if you prefer. 
    client.stream('statuses/filter', {track: 'münchen'}, function(stream) {
        stream.on('data', function(event) {
            console.log("---Ev----------");
            console.log(event);
            console.log("---Ev.text-----");
            console.log(event.text);
            console.log("---------------");
        });
        
        stream.on('error', function(error) {
            console.log("something went wrong!");
        });
    });
    */
 
    XE.LogF("syncognite","Twitter","Info","Starting twitter stream");
}

module.exports = new Twitter();
