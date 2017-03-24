var xe = require('../node-syncognite.js');
var CLog = function() {};

CLog.prototype.date = function(m) {
    var dateString = m.getFullYear() + "." + ("0" + (m.getMonth() + 1)).slice(-2) + "." +
        ("0" + m.getDate()).slice(-2) + " " + ("0" + m.getHours()).slice(-2) + ":" +
        ("0" + m.getMinutes()).slice(-2) + ":" + ("0" + m.getSeconds()).slice(-2) + "." +
        ("00" + m.getMilliseconds()).slice(-3);
    return dateString;
}
// Just a helper function for logging to the console with a timestamp.
CLog.prototype.console = function(message) {
    var m = new Date();
    var tm = this.date(m)
    console.log("[" + tm + "] " + message);
}

CLog.prototype.consoleJson = function(message) {
    var m = new Date();
    var tm2
    var tm = this.date(m);
    var msg = JSON.parse(message);
    var ms = parseFloat(msg["Date"]) * 1000;
    var m2 = new Date(ms);
    tm2 = "|" + this.date(m2);
    console.log("[" + tm + tm2 + "] " + message);
}

CLog.prototype.init = function(md) {
    console.log("INIT!");
}

module.exports = new CLog();
