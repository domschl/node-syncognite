var fs = require('fs');
var pa = require('path');
var mods = {};
var CLog = {};
var MDb = null;

global.entityStates = {};
global.subscriptions = {};

function setup() {
    var progdir = pa.dirname(process.argv[1]);
    var conffile = pa.join(progdir, 'node-syncognite.json');
    console.log("syncognite 0.1.5"); // TODO: sync with package.json
    console.log("Starting: " + progdir + ", conf: " + conffile);
    fs.readFile(conffile, 'utf8', function (err, data) {
        var configXK;
        if (err) {
            console.log("Failed to read 'node-syncognite.json' configuration file. You can create one by copying 'node-syncognite.json.default'.");
            return;
        }
        try {
            configXK = JSON.parse(data);
        } catch (errv) {
            console.log("Invalid json format: " + conffile);
            return;
        }
        for (var md in configXK.modules) {
            mods[md] = configXK.modules[md];
            if (mods[md].active) {
                mods[md].obj = require(mods[md].require);
                if (md == "MongoDb") {
                    MDb = mods[md].obj;
                }
                if (md == "Util") {
                    CLog = mods[md].obj;
                }
                mods[md].obj.init(mods[md]);
                if (typeof CLog != "undefined") CLog.console("Loading: " + md);
            }
        }
    });
}

setup();

function xEventLog(msg) {
    if (MDb!=null) {
    if (MDb.db() !== 0) {
        dblog = { //Date, Name, Level, Topic, Msg
            'Timestamp': msg.Date,
            'Name': msg.Name,
            'Level': msg.Level,
            'Topic': msg.Topic,
            'Msg': msg.Msg
        };
        MDb.db().collection(MDb.lc()).insert(dblog, function (err, recs) {
            if (err) {
                CLog.console("Inserting dblog record into mongo db failed!");
            }
        });
    }
    }

    mods.WebSocket.obj.logevent(msg);
    if ("Mqtt" in mods) {
        mods.Mqtt.obj.publish(msg);
    }
}


function entitySetProperty(entity, property, val, timestamp) {

    /* Generally, redundancy-filter is not a good idea, since a change in timestamp does carry information.
    if (dobj != undefined) {
        dr = dobj[property];
        if (dr != undefined) {
            if (dr.value == val) {
                // redundant set, this was already the value - ignored!
                return -1;
            }
        }
    } */
    if (timestamp == "now") {
        CLog.console("Sombody tried to smash 'now' into the entitydb at :" + entity + "/" + property);
    }
    if (MDb!=null) {
        if (MDb.db() !== 0) {
        dbEnt = { //Date, Name, Level, Topic, Msg
            'Timestamp': timestamp,
            'Entity': entity,
            'Property': property,
            'Value': val
        };
        MDb.db().collection(MDb.ec()).insert(dbEnt, function (err, recs) {
            if (err) {
                CLog.console("Inserting dbent record into mongo db failed!");
            }
        });
    }}

    var dobj = entityStates[entity];

    if (MDb!=null) {
    if (MDb.db() !== 0) {
        if (dobj == undefined) { // New entity:
            entityStates[entity] = {};
        }
        if (entityStates[entity][property] == undefined) {
            var es = {
                Entity: entity,
                Property: property
            };
            MDb.db().collection(MDb.es()).insert(es, function (err, recs) {
                if (err) {
                    CLog.console("Inserting into entityspace failed!");
                } else {
                    CLog.console("Learning new prop: " + es.Entity + "/" + es.Property);
                }
            });
            entityStates[entity][property] = {
                value: val,
                time: timestamp,
            };
        } else {
            entityStates[entity][property].value = val;
            entityStates[entity][property].time = timestamp;
        }
    } else {
        CLog.console("Tried to write entity state, yet mongodb isn't up yet!");
    }}
    LogF(entity, property, "Verbose", val);
    return 0;
}

function cmpEntities(e1, e2) {
    if (e1 == e2) return true;
    var se1 = e1.split('/');
    var se2 = e2.split('/');
    if (se1.length < se2.length) {
        var b = se1;
        se1 = se2;
        se2 = b;
    }
    for (i = 0; i < se1.length; i++) {
        if (se1[i] == '#') return true;
        if (se2.length < i) return false;
        if (se1[i] == '+') continue;
        if (se2[i] == '+') continue;
        if (se1[i] !== se2[i]) return false;
    }
    return true;
}

var xEventEntity = function (msg) {
    //    CLog.console("Entity: " + msg.Entity + " Property: " + msg.Property + " Value: " + msg.Value);
    if (entitySetProperty(msg.Entity, msg.Property, msg.Value, msg.Time) == -1) {
        return; // Something bad happened!
    }
    for (var sub in subscriptions) {
        if (cmpEntities(msg.Entity, sub)) {
            subscriptions[sub](msg);
        }
    }
    if ("WebSocket" in mods) {
        mods.WebSocket.obj.entityevent(msg);
    }
};

var xEvent = function (message) {
    //CLog.consoleJ(message)

    if ("ZeroMQ" in mods) {
        // Send to 0mq pub socket
        mods.ZeroMQ.obj.pub().send(message);
    }

    // Send to websocket clients
    msg = JSON.parse(message);
    if (msg.MsgType == "LogMsg") {
        xEventLog(msg);
    } else if (msg.MsgType == "EntityMsg") {
        xEventEntity(msg);
    } else {
        Log("Websockets", "Error", "Unknown message type: " + msg.MsgType);
    }
};

var xSubscribe = function (entity, subFunc) {
    subscriptions[entity] = subFunc;
};


var Log = function (topic, level, message) {
    var d = new Date();
    var ms = d.getTime() / 1000.0;
    var msg = {
        Date: ms,
        MsgType: "LogMsg",
        Name: "syncognite",
        Topic: topic,
        Level: level,
        Msg: message
    };
    var smsg = JSON.stringify(msg);
    xEvent(smsg);
};

var LogF = function (name, topic, level, message) {
    var d = new Date();
    var ms = d.getTime() / 1000.0;
    var msg = {
        Date: ms,
        MsgType: "LogMsg",
        Name: name,
        Topic: topic,
        Level: level,
        Msg: message
    };
    var smsg = JSON.stringify(msg);
    xEvent(smsg);
};

module.exports = {
    x: xEvent,
    cmp: cmpEntities,
    sub: xSubscribe,
    ent: xEventEntity,
    Log: Log,
    LogF: LogF
};