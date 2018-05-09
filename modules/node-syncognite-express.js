var http = require('http');
var https = require('https');
var express = require('express');
var fs = require('fs');
var pa = require('path');
var CLog = require('./node-syncognite-util.js');

var EWeb = function () {};
var webserver;

EWeb.prototype.init = function (md) {
    var webapp = express();
    var credentials;
    var progdir = pa.dirname(process.argv[1]);
    pk = pa.join(progdir, md.PrivateKey);
    ct = pa.join(progdir, md.Certificate);
    dr = pa.join(progdir, md.DocumentRoot);
    try {
        credentials = {
            key: fs.readFileSync(pk),
            cert: fs.readFileSync(ct)
        };
    } catch (err) {
        console.log("The 'Certs' directory needs to contain certificates as configured in 'node-syncognite.json'.");
        throw err;
    }

    webserver = https.createServer(credentials, webapp);
    webserver.listen(md.WebServerPort);
    webapp.use(express.static(dr));
    CLog.console("Web server listening on port " + md.WebServerPort.toString() + " (https only)");
    //  var webserver = webapp.listen(WebServerPort,function() {
    //    var port=webserver.address().port;
    //    logToConsole("Web Server on port: " + port.toString());
    //  });
};

EWeb.prototype.getWebServer = function () {
    return webserver;
};

module.exports = new EWeb();