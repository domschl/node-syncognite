var request = require('request');

var CLog = require('./node-syncognite-util.js');
var XE = require('../node-syncognite.js');

var lastentityFileWrite=0;
var csrfToken='';

var fhemAddress='';
var fhemDevList=[];

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
}

function fhemSubscriptions(msg) {
    CLog.console("Got sub-msg: "+msg);
    for (var i in fhemDevList) {
        var fdev=fhemDevList[i];
        if (XE.cmp(fdev['address'],msg['Entity'])) {
            XE.LogF("syncognite","FHEM","Debug","cmp: "+fdev['address']+" "+msg['Entity']);
            XE.LogF("syncognite","FHEM","Info","Got something! " + fdev['fhemDevName'] + ": " + msg['Property'] + " " + msg['Value']);
            var cmd='';
            if (msg['Property'] == 'state') {
                cmd="set "+fdev['fhemDevName']+' '+ msg['Value'];
            } else {
                cmd="set "+fdev['fhemDevName']+' '+msg['Property'] + " " + msg['Value'];
            }
            fhemCmd(cmd,undefined);
        }
    }
}

var reconnectIntervalEnd=200;
var reconnectIntervalError=2000;
var isConnected=0;
var wasConnected=0;
var pollActive=0;
var hasError=0;
var gotFhemDevlist=false;
function fhemLongPoll(fhemAddr) {
    var filter = ".*";
    var since = "null";
    var address = fhemAddr;
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
        })
        .on('data', function(data) {
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
                        break;
                    }
                    if (obj.length != 3) {
                        XE.LogF("syncognite","FHEM","Error","Unexpected length "+obj.length);
                        break;
                    }
                    var dd=obj[0].split("-");
                    if (dd.length==1) { // just HTML garbage, was just a state in earlier versions
                        st_ignorehtml += 1;
                    } else if (dd.length==2) {
                        curentity=dd[0]
                        curProperty=dd[1]
                        curval=obj[1]
                    } else if (dd.length==3) {
                        if (curentity!=dd[0] || curProperty!=dd[1] || dd[2]!="ts") {
                            XE.LogF("syncognite","FHEM","Error","Unexpected timestamp record: "+obj[0])
                            break;
                        }
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
            if (!gotFhemDevlist) {
                gotFhemDevlist=true;
                fhemInitialReadall();
            }
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
        XE.LogF("syncognite","FHEM","Error","FHEM longpoll failure: "+e.message);
        return;
    }
}

function fhemCmd(cmd,ansfunc) {
    var request = require('request');
    this.connection = {
        'base_url': fhemAddress,
        'request': request
    };
    jsdata='';

    var query = "/fhem.pl?XHR=1" + "&cmd=" + cmd

    if (csrfToken !== '') {
        query += '&fwcsrf='+csrfToken;
    }
    
    XE.LogF("syncognite","FHEM","Info","Requesting "+cmd);
    var url = encodeURI(fhemAddress + query);
    try {
    connection.request.get({ 
        url: url
    })
    .on('data', function(data) {
        XE.LogF("syncognite","FHEM","Info","Chunk");
        jsdata+=data;
    })
    .on( 'end', function() {
            XE.LogF("syncognite","FHEM","Info","End reached");
        try {
            var fhemAns = JSON.parse(jsdata);
        } catch (err) {
            console.log("Invalid json format in jsonlist2: " + err.message);
            return;
        }
        if (ansfunc !== undefined) ansfunc(fhemAns); 
    } )
    .on('error', function(err) {
        if (hasError==0) {
            XE.LogF("syncognite","FHEM","Error","Error: "+err);
        }
    })
    } catch (e) {
        XE.LogF("syncognite","FHEM","Error","FHEM request.get: "+e.message);
    }
}


function addFhemDevs(fhemDevs) {
    for (var i in fhemDevs['Results']) {
        if (fhemDevs['Results'][i]['Attributes']['nsname'] !== undefined) {
            XE.LogF("syncognite","FHEM","Info","Device: "+fhemDevs['Results'][i]['Name']+' -> '+fhemDevs['Results'][i]['Attributes']['nsname']);
            sl=fhemDevs['Results'][i]['Attributes']['nsaddr'].split('|');
            for (var j in sl) {
                XE.sub(sl[j],fhemSubscriptions);
                var fdev={};
                fdev['fhemDevName']=fhemDevs['Results'][i]['Name'];
                fdev['address']=sl[j];
                XE.LogF("syncognite","FHEM","Debug","Sub: "+sl[j]);
                fhemDevList.push(fdev);
            }
        }
    }
}

function fhemInitialReadall() {
    fhemCmd("jsonlist2",addFhemDevs);
}

function fhemInitialReadallOld() {
    var address=fhemAddress;
    var request = require('request');
    this.connection = {
        'base_url': address,
        'request': request
    };
    jsdata='';

    var query = "/fhem.pl?XHR=1" +
        "&cmd=jsonlist2"

    if (csrfToken !== '') {
        query += '&fwcsrf='+csrfToken;
    }
    
    XE.LogF("syncognite","FHEM","Info","Requesting jsonlist2 ");
    var url = encodeURI(address + query);
    try {
    connection.request.get({ 
        url: url
    })
    .on('data', function(data) {
        XE.LogF("syncognite","FHEM","Info","Chunk at jsonlist2 ");
        jsdata+=data;
    })
    .on( 'end', function() {
            XE.LogF("syncognite","FHEM","Info","End reached at jsonlist2 ");
        try {
            var fhemDevs = JSON.parse(jsdata);
        } catch (err) {
            console.log("Invalid json format in jsonlist2: " + err.message);
            return;
        }
        addFhemDevs(fhemDevs)
    } )
    .on('error', function(err) {
        if (hasError==0) {
            XE.LogF("syncognite","FHEM","Error","Error: "+err);
        }
    })
    } catch (e) {
        XE.LogF("syncognite","FHEM","Error","FHEM longpoll failure: "+e.message);
    }
}


var Fhem = function() {};

Fhem.prototype.init = function(md) {
    if (md['FhemAddress'].length > 0) {
        fhemAddress=md['FhemAddress'];
        XE.LogF("syncognite","FHEM","Info","Starting long poll to FHEM server at "+fhemAddress);
        XE.sub("FHEM/#",fhemSubscriptions);
        CLog.console("FHEM long poll at: "+fhemAddress);
        fhemLongPoll(fhemAddress);
    }
    // CLog.console("FHEM failure");
}

module.exports = new Fhem();
