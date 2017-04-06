var request = require('request');

var CLog = require('./node-syncognite-util.js');
var XE = require('../node-syncognite.js');

var lastentityFileWrite=0;
var csrfToken='';

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
    CLog.console("SetProperty: "+JSON.stringify(msg));
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
    var olddata = "";

    if (pollActive) {
        XE.LogF("syncognite","FHEM","Warning","Possible recursion avoided?");
        return;
    }
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
    var curentity=""
    var curProperty=""
    var currval=""
    var st_ignorehtml=0;
    try {
        connection.request.get({ // XXX: reconnect?
            url: url
        }).on('data', function(data) {
            var str=olddata+data;
            olddata = "";
            var evs = str.split("\n");
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
                        olddata=evs[i]
                        // XE.LogF("syncognite","FHEM","Debug","Incomplete data received: "+evs[i]);
                        break;
                    }
                    if (obj.length != 3) {
                        XE.LogF("syncognite","FHEM","Error","Unexpected length "+obj.length);
                        break;
                    }
                    //XE.LogF("syncognite","FHEM","Debug","Data: "+evs[i]);
                    //CLog.console(evs[i]);
                    var dd=obj[0].split("-");
                    if (dd.length==1) { // just HTML garbage, was just a state in earlier versions
                        st_ignorehtml += 1;
                        // XE.LogF("syncognite","FHEM","Debug","HTML data ignored for "+dd[0])    
                        // fhemSetEntity(obj[0],"state",obj[1],Date.now()/1000.0);
                        // curentity=""
                        // curProperty=""
                        // currval=""
                    } else if (dd.length==2) {
                        curentity=dd[0]
                        curProperty=dd[1]
                        curval=obj[1]
                    } else if (dd.length==3) {
                        if (curentity!=dd[0] || curProperty!=dd[1] || dd[2]!="ts") {
                            XE.LogF("syncognite","FHEM","Error","Unexpected timestamp record: "+obj[0])
                            break;
                        }
                        // 'T' would cause UTC, but FHEM timestamps are just localtime
                        //fhemSetEntity(curentity,curProperty,curval,Date.parse(obj[1].replace(" ","T"))/1000.0);
                        fhemSetEntity(curentity,curProperty,curval,Date.parse(obj[1])/1000.0);                    
                        curentity=""
                        curProperty=""
                        currval=""
                    } else {
                        XE.LogF("syncognite","FHEM","Error","Entity: "+obj[0]+" record length unexpected: "+dd.length);
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
            .on( 'response', function(response) {
                if( response.headers && response.headers['x-fhem-csrftoken'] )
                    csrfToken = response.headers['x-fhem-csrftoken'];
                else
                    csrfToken = '';
                XE.LogF("suncognite","FHEM","Info","csrfToken:"+csrfToken);
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
    } catch (e) {
        XE.LogF("syncognite","FHEM","Error","FHEM longpoll failure");
        return;
    }

}

function fhemInitiallReadall(address) {
    var request = require('request');
    this.connection = {
        'base_url': address,
        'request': request
    };

    var query = "/fhem.pl?XHR=1" +
        "&cmd=jsonlist2"

    var url = encodeURI(address + query);
    connection.request.get({ 
        url: url
    }).on('data', function(data) {
    })
    .on( 'end', function() {
    } )
    .on('error', function(err) {
        if (hasError==0) {
            XE.LogF("syncognite","FHEM","Error","Error: "+err);
        }
    })
}

var Fhem = function() {};

Fhem.prototype.init = function(md) {
  if (md['FhemAddress'].length > 0) {
      XE.LogF("syncognite","FHEM","Info","Starting long poll to FHEM server at "+md['FhemAddress']);
      CLog.console("FHEM long poll at: "+md['FhemAddress']);
    fhemLongPoll(md['FhemAddress']);
  }
    CLog.console("FHEM failure");
}

module.exports = new Fhem();
