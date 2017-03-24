var CLog = require('./node-syncognite-util.js');
var XE = require('../node-syncognite.js');

var lastentityFileWrite=0;

var ignoreProperties = {T:0, azimuth:0, elevation:0, powerFactor:0, current:0,
    voltage:0, energy:0, pysLevel:0, deviceMsg:0, bass:0, '3dCinemaDsp':0, dsp:0, enhancer:0,
    inputName:0, adaptiveDrc:0, sleep:0, direct:0, treble:0, compasspoint:0,
    lastResult:0, aktEvent:0, nextEvent:0, nextEventTime:0, };
var ignoreEntityStates = {MacXBMC:0, }

function isIgnore(entity,Property,val) {
    if (ignoreProperties[Property]!=undefined) return true;
    if (ignoreEntityStates[entity]!=undefined) return true;
    return false;
}

function fhemSetEntity(entity, property, val, timestamp) {
    if (isIgnore(entity,property,val)) return;
    if (!isNaN(parseFloat(val))) val=parseFloat(val);
    CLog.console("xt:"+timestamp);
    var m = new Date(timestamp*1000.0);
    CLog.console("t:"+CLog.date(m));
    var msg= {MsgType:"EntityMsg", Entity: entity, Property: property, Value: val, Time: timestamp};
    XE.ent(msg);
    // entitySetProperty(entity, property, val, timestamp);
}

var reconnectIntervalEnd=200;
var reconnectIntervalError=2000;
var isConnected=0;
var wasConnected=0;
var pollActive=0;
var hasError=0;
function fhemLongPoll(fhemAddress) {
    var filter = ".*";
    var since = "null";
    var address = fhemAddress;

    if (pollActive) {
        XE.LogF("syncognite","FHEM","Warning","Possible recursion avoided?");
        return;
    }
    var request = require('request');
    this.connection = {
        'base_url': address,
        'request': request
    };

    var query = "/fhem.pl?XHR=1" +
        "&inform=type=status;filter=" + filter + ";since=" + since + ";fmt=JSON" +
        "&timestamp=" + Date.now()

    var url = encodeURI(address + query);
    // console.log('starting longpoll: ' + url);
    // console.log('---------------------------')
    pollActive=1;
    connection.request.get({ // XXX: reconnect?
        url: url
    }).on('data', function(data) {
        var str=""+data;
        var evs = str.split("\n");
        var curentity=""
        var curProperty=""
        var currval=""
        if (isConnected==0) {
            if (wasConnected==0) {
                XE.LogF("syncognite","FHEM","Info","Connected to FHEM server");
            } else {
                XE.LogF("syncognite","FHEM","Info","Reconnected to FHEM server");
            }
        }
        wasConnected=1;
        isConnected=1;
        hasError=0;
        for (var i = 0; i < evs.length; i++) {
                if (evs[i].length > 3) {
                    try {
                    obj=JSON.parse(evs[i]);
                } catch (e) {
                    XE.LogF("syncognite","FHEM","Error","Invalid object received"+evs[i]);
                    break;
                }
                if (obj.length != 3) {
                    XE.LogF("syncognite","FHEM","Error","Unexpected length "+obj.length);
                    break;
                }
                var dd=obj[0].split("-");
                if (dd.length==1) { // just a state
                    fhemSetEntity(obj[0],"state",obj[1],Date.now()/1000.0);
                    var curentity=""
                    var curProperty=""
                    var currval=""
                } else if (dd.length==2) {
                    curentity=dd[0]
                    curProperty=dd[1]
                    curval=obj[1]
                } else if (dd.length==3) {
                    if (curentity!=dd[0] || curProperty!=dd[1] || dd[2]!="ts") {
                        XE.LogF("syncognite","FHEM","Error","Unexpected timestamp record: "+obj[0])
                        break;
                    }
                    fhemSetEntity(curentity,curProperty,curval,Date.parse(obj[1].replace(" ","T"))/1000.0);
                    var curentity=""
                    var curProperty=""
                    var currval=""
                } else {
                    XE.LogF("syncognite","FHEM","Error","Messed up entity: "+obj[0]);
                    break;
                }
            }
        }
        //        evs = JSON.parse(data);
        //        for (var i=0; i<evs.length; i++) console.log(evs[i]);
    })
    .on( 'end', function() {
        XE.LogF("syncognite","FHEM","Info","Longpoll-end, restarting");
        pollActive=0;
        setTimeout(fhemLongPoll, reconnectIntervalEnd);
    } )
    .on('error', function(err) {
        if (hasError==0) {
            XE.LogF("syncognite","FHEM","Error","Longpoll-error: "+err);
        }
        hasError=1;
        pollActive=0;
        isConnected=0;
        setTimeout(fhemLongPoll, reconnectIntervalError);
    })

}

var Fhem = function() {};

Fhem.prototype.init = function(md) {
  if (md['FhemAddress'].length > 0) {
    XE.LogF("syncognite","FHEM","Info","Starting long poll to FHEM server at "+md['FhemAddress']);
    fhemLongPoll(md['FhemAddress']);
  }
}

module.exports = new Fhem();
