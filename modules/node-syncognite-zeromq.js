var zmq = require("zmq");
var CLog = require('./node-syncognite-util.js');
var XE = require('../node-syncognite.js');

var zmqRegEventCmdClients;
var zmqPubClients;
var zmqEventCmdClients;

var Zmq = function () {};

Zmq.prototype.init = function (md) {
    zmqRegEventCmdClients = zmq.socket("rep");
    zmqPubClients = zmq.socket("pub");
    zmqEventCmdClients = {};

    zmqPubClients.bind("tcp://*:" + md.ZmqPubSocket.toString(), function (error) {
        if (error) {
            CLog.console("Failed to bind zmqPubClients socket: " + error.message);
            process.exit(0);
        } else {
            CLog.console("zmqPub-Server listening on port " + md.ZmqPubSocket.toString());
        }
    });
    zmqRegEventCmdClients.bind("tcp://*:" + md.ZmqReqSocket.toString(), function (error) {
        if (error) {
            CLog.console("Failed to bind zmqRegEventCmdClients socket: " + error.message);
            process.exit(0);
        } else {
            CLog.console("zmqEventCmd-Server listening on port " + md.ZmqReqSocket.toString());
        }
    });
    zmqRegEventCmdClients.on("message", zmqReqEventMessage);
};

function zmqReqEventMessage(message) {
    CLog.console(message);
    var msg = JSON.parse(message);
    if (msg.MsgType == "RegisterEventCommander") {
        XE.Log("ZeroMQ", "Info", "Received registration from EventCommander " + msg.Name + " at: " + msg.EventAddress);
        p = zmqEventCmdClients[msg.Name];
        if (p == undefined) {
            XE.Log("ZeroMQ", "Verbose", msg.Name + " first registration");
            zmqEventCmdClients[msg.Name] = {}; // new Object();
        } else {
            XE.Log("ZeroMQ", "Verbose", msg.Name + " re-registration");
            zmqEventCmdClients[msg.Name].zmqEventCmdClients.close();
        }
        zmqEventCmdClients[msg.Name].address = msg.EventAddress;
        zmqEventCmdClients[msg.Name].zmqEventCmdClients = new zmq.socket("sub");
        zmqEventCmdClients[msg.Name].zmqEventCmdClients.connect(msg.EventAddress);
        zmqEventCmdClients[msg.Name].zmqEventCmdClients.addListener('message', XE.x);
        zmqEventCmdClients[msg.Name].zmqEventCmdClients.subscribe('');
        zmqRegEventCmdClients.send("{\"State\": \"OK\"}");
    } else {
        zmqRegEventCmdClients.send("{\"State\": \"NOT UNDERSTOOD!\"}");
    }
}

Zmq.prototype.pub = function () {
    return zmqPubClients;
};

module.exports = new Zmq();