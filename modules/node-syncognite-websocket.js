var WebSocketServer = require('ws').Server;
var uuid = require('node-uuid');

var CLog = require('./node-syncognite-util.js');
var EWeb = require('./node-syncognite-express.js');
var XE = require('../node-syncognite.js');
var MDB = require('./node-syncognite-mongo.js');

var wss;
var wsclients = [];

var WebSock = function () {};

WebSock.prototype.init = function (md) {
    wss = new WebSocketServer({
        server: EWeb.getWebServer()
    });
    CLog.console("Websocket-Server listening");
    wss.on('connection', wssConnection);
}

function wssConnection(ws) {
    var wsclient_uuid = uuid.v4();
    wsclients.push({
        "id": wsclient_uuid,
        "ws": ws,
        "filter": {},
        "Init": 0
    });
    XE.Log("Websockets", "Verbose", 'client connected: ' + wsclient_uuid);

    ws.on('message', function (message) {
        for (var i = 0; i < wsclients.length; i++) {
            if (wsclients[i].id == wsclient_uuid) {
                obj = JSON.parse(message);
                if (obj["MsgType"] == "FilterMsg") {
                    wsclients[i].filter = obj;
                    wsclients[i].Init = 1;
                    XE.Log("Websockets", "Verbose", "Filter: " + obj);

                    //db.Log.find({'Name': { $regex: 'Borg.*'}}).sort({Timestamp: -1}).limit(2)
                    if (MDB.db() !== 0) { // send last 200 log messages
                        var options = {
                            sort: {
                                'Timestamp': -1
                            },
                            limit: 200
                        }
                        var searchcrt = {};
                        if (obj['Name'].length > 0 && obj['Name'] != ".*") {
                            searchcrt['Name'] = {
                                $regex: obj['Name']
                            };
                        }
                        if (obj['Level'].length > 0 && obj['Level'] != ".*") {
                            searchcrt['Level'] = {
                                $regex: obj['Level']
                            };
                        }
                        if (obj['Topic'].length > 0 && obj['Topic'] != ".*") {
                            searchcrt['Topic'] = {
                                $regex: obj['Topic']
                            };
                        }
                        if (obj['Msg'].length > 0 && obj['Msg'] != ".*") {
                            searchcrt['Msg'] = {
                                $regex: obj['Msg']
                            };
                        }
                        // console.log(searchcrt);
                        MDB.db().collection(MDB.lc()).find(searchcrt,
                            //{'Name': { $regex: obj['Name']}, 'Level': { $regex: obj['Level']}, 'Topic': { $regex: obj['Topic']}}
                            options
                        ).toArray(function (err, msgs) {
                            if (err) {
                                CLog.console("History search yielded err!");
                            } else {
                                m2 = {
                                    "MsgType": "LogMsgList",
                                    "Msgs": []
                                };
                                for (i = msgs.length - 1; i >= 0; i--) {
                                    var msg = {
                                        Date: msgs[i]["Timestamp"],
                                        MsgType: "LogMsg",
                                        Name: msgs[i]["Name"],
                                        Topic: msgs[i]["Topic"],
                                        Level: msgs[i]["Level"],
                                        Msg: msgs[i]["Msg"],
                                    };
                                    m2["Msgs"].push(msg);
                                }
                                ws.send(JSON.stringify(m2));
                            }
                        });
                    } else {
                        CLog.console("Database not yet available!!!")
                    }

                } else {
                    // Forward message from web-socket client to xEvent queue.
                    xEvent(message)
                }
            }
        }
    });

    ws.on('close', function () {
        for (var i = 0; i < wsclients.length; i++) {
            if (wsclients[i].id == wsclient_uuid) {
                XE.Log("Websockets", "Verbose", 'client disconnected: ' + wsclient_uuid);
                wsclients.splice(i, 1);
            }
        }
    })
}


WebSock.prototype.pub = function () {
    return;
}

WebSock.prototype.entityevent = function (msg) {
    for (var i = 0; i < wsclients.length; i++) {
        if (wsclients[i].Init == 0) continue;
        try {
            r1 = RegExp(wsclients[i].filter["Entities"]);
        } catch (error) {
            XE.Log("Websockets", "Error", "Invalid entities regex: " + wsclients[i].filter["Entities"])
            wsclients[i].filter["Entities"] = ".*"
            continue;
        }
        if (!r1.test(msg["Entity"])) {
            continue;
        }
        try {
            r2 = RegExp(wsclients[i].filter["Properties"]);
        } catch (error) {
            XE.Log("Websockets", "Error", "Invalid properties regex: " + wsclients[i].filter["Properties"])
            wsclients[i].filter["Properties"] = ".*"
            continue;
        }
        if (!r2.test(msg["Property"])) {
            continue;
        }
        var wsclientSocket = wsclients[i].ws;
        wsclientSocket.send(JSON.stringify(msg))
    }
}

WebSock.prototype.logevent = function (msg) {
    for (var i = 0; i < wsclients.length; i++) {
        if (wsclients[i].Init == 0) continue;
        try {
            r1 = RegExp(wsclients[i].filter["Name"]);
        } catch (error) {
            XE.Log("Websockets", "Error", "Invalid regex: " + wsclients[i].filter["Name"])
            wsclients[i].filter["Name"] = ".*"
            continue;
        }
        if (!r1.test(msg["Name"])) {
            continue;
        }
        try {
            r2 = RegExp(wsclients[i].filter["Topic"]);
        } catch (error) {
            XE.Log("Websockets", "Error", "Invalid regex: " + wsclients[i].filter["Topic"])
            wsclients[i].filter["Topic"] = ".*"
            continue;
        }
        if (!r2.test(msg["Topic"])) {
            continue;
        }
        try {
            r3 = RegExp(wsclients[i].filter["Level"]);
        } catch (error) {
            XE.Log("Websockets", "Error", "Invalid regex: " + wsclients[i].filter["Level"])
            wsclients[i].filter["Level"] = ".*"
            continue;
        }
        if (!r3.test(msg["Level"])) {
            continue;
        }
        try {
            r4 = RegExp(wsclients[i].filter["Msg"]);
        } catch (error) {
            XE.Log("Websockets", "Error", "Invalid regex: " + wsclients[i].filter["Msg"])
            wsclients[i].filter["Msg"] = ".*"
            continue;
        }
        if (!r4.test(msg["Msg"])) {
            continue;
        }
        var wsclientSocket = wsclients[i].ws;
        try {
            wsclientSocket.send(JSON.stringify(msg))
        } catch (err) {
            // is already dead.
        }

    }
}

module.exports = new WebSock();