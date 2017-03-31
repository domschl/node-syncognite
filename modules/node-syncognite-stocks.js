var CLog = require('./node-syncognite-util.js');
var XE = require('../node-syncognite.js');

// https://www.npmjs.com/package/lyql
var LYQL = require('lyql');

var stockcmds = {
    "a00": "ask",
    "a50": "asksize",
    "b00": "bid",
    "b60": "bidsize",
    "c10": "change",
    "c63": "changerealtime",
    "c64": "disputedchangerealtimeafterhours",
    "c85": "changerealtimeafterhours",
    "c86": "percentchangerealtimeafterhours",
    "g53": "daylow",
    "h53": "dayhigh",
    "j10": "marketcap",
    "l10": "price",
    "l84": "pricerealtime",
    "l86": "pricerealtimeafterhours",
    "p20": "percentchange",
    "p43": "percentchangerealtime",
    "p44": "percentchangerealtimeafterhours",
    "t53": "disputedtimestampforcommodities",
    "t54": "disputedtimestampforstocks",
    "v53": "volume"
}
var invstockcmds = {}

function stockSetEntity(entity, property, val, timestamp) {
    var msg= {MsgType:"EntityMsg", Entity: entity, Property: property, Value: val, Time: timestamp};
    XE.ent(msg);
}

var Stock = function() {};

Stock.prototype.init = function(md) {
    for (var key in stockcmds) {
        if (stockcmds.hasOwnProperty(key)) {
            val=stockcmds[key];
            invstockcmds[val]=key;
        }
    }

    options={};
    options['Stocks']=md['Stocks']
    options['Parameters']=[]

    var im = function(s) { return invstockcmds[s] };
    
    options['Parameters']=md['Parameters'].map(im);
    
    var ticker = new LYQL(options, function(data) {
        for (var entity in data) {
            for (var prop in data[entity]) {
                var property=stockcmds[prop];
                var vals = data[entity][prop];
                var value=vals.replace(/[,+]/g,'');
                var timestamp = Math.floor(Date.now()/1000);
                stockSetEntity(entity,property,value,timestamp);
            }
        }
    });
 
    XE.LogF("syncognite","STOCK","Info","Starting stocks ticker poll");
    ticker.start();
}


module.exports = new Stock();
