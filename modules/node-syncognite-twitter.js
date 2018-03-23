var CLog = require('./node-syncognite-util.js');
var XE = require('../node-syncognite.js');

// https://www.npmjs.com/package/twitter
var TW = require('twitter');
// https://github.com/thisandagain/sentiment
var SENTI = require('sentiment');

function twitterSetEntity(entity, property, val, timestamp) {
    var msg = {
        MsgType: "EntityMsg",
        Entity: entity,
        Property: property,
        Value: val,
        Time: timestamp
    };
    XE.ent(msg);
}

var Twitter = function () {};

function isContained(text, token) {
    var textb = " " + text + " ";
    var seps = " #\\.\\,;:\\-\"\\(\\)";
    var sr1 = "[" + seps + "]";
    var searchreg = sr1 + token + sr1;
    var re = new RegExp(searchreg, "i");
    if (textb.search(searchreg) != (-1)) {
        //console.log(text+": "+token+" <"+searchreg+"> -> true");
        return true;
    } else {
        // console.log(text+": "+token+" <"+searchreg+"> -> false");
        return false;
    }
}


Twitter.prototype.init = function (md) {
    var client = new TW({
        consumer_key: md.consumer_key,
        consumer_secret: md.consumer_secret,
        access_token_key: md.access_token_key,
        access_token_secret: md.access_token_secret
    });
    var topics = md.topics;
    var tracker = "";

    for (var ent in topics) {
        var topic = topics[ent];
        for (var kwin in topic) {
            tracker = tracker + topic[kwin] + ", ";
        }
    }

    var stream = client.stream('statuses/filter', {
        track: tracker
    });
    stream.on('data', function (event) {
        var property = 'tweet';
        var value = event.text;
        var timestamp = Date.now() / 1000.0;
        for (var entity in topics) {
            var topiclist = topics[entity];
            for (var tin in topiclist) {
                var tl = topiclist[tin].split(" ");
                var isin = true;
                for (var tlin in tl) {
                    var kw = tl[tlin].toLowerCase();
                    var twt = event.text.toLowerCase();
                    if (!isContained(twt, kw)) {
                        isin = false;
                    }
                }
                if (isin == true) {
                    twitterSetEntity(entity, property, value, timestamp);
                    var se = SENTI(event.text);
                    var propertys = 'sentiment';
                    // { score: 0, comparative: 0, tokens: [ 'searles', 'chinese', 'room, words: [], positive: [], negative: [] }
                    var values = se.comparative;
                    if (Math.abs(value) > 0.01) {
                        twitterSetEntity(entity, propertys, values, timestamp);
                    }
                }
            }
        }
    });

    stream.on('error', function (error) {
        XE.LogF("syncognite", "Twitter", "Error", "Twitter stream error: " + error.message);
        // throw error;
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

    XE.LogF("syncognite", "Twitter", "Info", "Starting twitter stream");
};

module.exports = new Twitter();