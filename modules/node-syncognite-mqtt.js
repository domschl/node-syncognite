var CLog = require('./node-syncognite-util.js');
var XE = require('../node-syncognite.js');

// https://www.npmjs.com/package/mqtt
var mqtt = require('mqtt');

function mqttSetEntity(entity, property, val, timestamp) {
    var msg = {
        MsgType: "EntityMsg",
        Entity: entity,
        Property: property,
        Value: val,
        Time: timestamp
    };
    XE.ent(msg);
}

var Mqtt = function () {};
var mqttclient;

Mqtt.prototype.init = function (md) {
    mqttclient = mqtt.connect(md['MqttServer']);

    mqttclient.on('connect', function () {
        mqttclient.subscribe('log/#');
    });

    mqttclient.on('message', function (topic, message) {
        // message is Buffer 
        try {
            var msg = JSON.parse(message);
            XE.LogF("MQTT", msg["topic"], msg["severity"], msg["msg"]);
        } catch (err) {
            XE.LogF("MQTT", "Format", "Error", message.toString());
        }
        // kills it: client.end();
    });
    XE.LogF("syncognite", "Mqtt", "Info", "Starting mqtt stream");
}

Mqtt.prototype.publish = function (msg) {
    /*
    'Timestamp': msg['Date'],
    'Name': msg['Name'],
    'Level': msg['Level'],
    'Topic': msg['Topic'],
    'Msg': msg['Msg']
    */
    mqttclient.publish(msg['Name'] + '/' + msg['Topic'], msg['Msg']);
}

module.exports = new Mqtt();