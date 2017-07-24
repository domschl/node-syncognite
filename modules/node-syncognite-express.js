var http = require('http');
var https = require('https')
var express = require('express');
var fs = require('fs');

var EWeb = function () {};
var webserver;

EWeb.prototype.init = function (md) {
    var webapp = express();
    var credentials;
    try {
        credentials = {
            key: fs.readFileSync(md['PrivateKey']),
            cert: fs.readFileSync(md['Certificate'])
        }
    } catch (err) {
        console.log("The 'Certs' directory needs to contain certificates as configured in 'node-syncognite.json'.");
        throw err;
    }

    webserver = https.createServer(credentials, webapp);
    webserver.listen(md['WebServerPort']);
    webapp.use(express.static(md['DocumentRoot']));
    //  var webserver = webapp.listen(WebServerPort,function() {
    //    var port=webserver.address().port;
    //    logToConsole("Web Server on port: " + port.toString());
    //  });
}

EWeb.prototype.getWebServer = function () {
    return webserver;
}

module.exports = new EWeb();