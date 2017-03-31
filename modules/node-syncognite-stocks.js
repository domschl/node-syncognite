var CLog = require('./node-syncognite-util.js');
var XE = require('../node-syncognite.js');
var LYQL = require('lyql');

function stockSetEntity(entity, property, val, timestamp) {
    var msg= {MsgType:"EntityMsg", Entity: entity, Property: property, Value: val, Time: timestamp};
    XE.ent(msg);
}

var options = {
  "Stocks": ["GOOG", "AAPL", "JPYUSD=X"],
  // Price, Change, and Volume 
  "Parameters": ["l84", "p43", "v53"]
};

var Stock = function() {};

Stock.prototype.init = function(md) {
    XE.LogF("syncognite","STOCK","Info","Starting stocks ticker poll");
    var ticker = new LYQL(options, function(data) {
        console.log(data);
    });
 
    ticker.start();
}


module.exports = new Stock();
