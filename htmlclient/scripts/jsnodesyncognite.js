var port = 3000;
var hostn = window.location.hostname;
var serveraddr;

var sa=localStorage['ServerAddress'];
if (!sa || sa=="") {
    serveraddr = hostn + ':' + String(port);
    localStorage['ServerAddress']=serveraddr;
} else {
    serveraddr=sa;
}

var dataM = [];
var nrmsg = 0;

function inIframe () {
    return false;
    try {
        return window.self !== window.top;
    } catch (e) {
            return true;
    }
}
function setHeight() {
    var ht = $(window).height()-$("#instruments").height()-90;
    $("#framer").css("max-height",ht);
    $("#framer").css("min-height",ht);
}
$(document).ready(function(){
    $(window).resize(function(){
        drawBasic();
        setHeight();
    });
    setHeight();
    document.getElementById("apptitle").innerHTML = "Log | " + serveraddr;
    connect();

    $('#search').on('click', function(e) {
        console.log("Searchclick!")
        document.getElementById("name-text").value = filter["Name"];
        document.getElementById("level-text").value = filter["Level"];
        document.getElementById("topic-text").value = filter["Topic"];
        document.getElementById("msg-text").value = filter["Msg"];
        $('#filterModal').modal('show')
        $('#filterModal').on('shown.bs.modal', function () {
            $('#name-text').focus();
        })
        $('#filterSave').off('click').on('click', function() {
            console.log("saving new filter");
            filter["Name"] = document.getElementById("name-text").value;
            filter["Level"] = document.getElementById("level-text").value;
            filter["Topic"] = document.getElementById("topic-text").value;
            filter["Msg"] = document.getElementById("msg-text").value;
            console.log(filter["Name"]);
            localStorage['FilterName']=filter["Name"];
            localStorage['FilterLevel']=filter["Level"];
            localStorage['FilterTopic']=filter["Topic"];
            localStorage['FilterMsg']=filter["Msg"];
            ws.send(JSON.stringify(filter));
            console.log("Filter-update sent.");
            scrollList("New filter, Name: "+filter["Name"]+" Level: "+filter["Level"]+" Topic: "+filter["Topic"]+" Msg: "+filter["Msg"], "bg-success")
        })
    })
    $('#config').on('click', function() {
        console.log("Configclick!")
        document.getElementById("server-address").value = serveraddr;
        $('#serverModal').modal('show')
        $('#serverModal').on('shown.bs.modal', function () {
            $('#server-address').focus();
        })
        $('#serverSave').off('click').on('click', function() {
            console.log("saving: ", document.getElementById("server-address").value)
            serveraddr = document.getElementById("server-address").value;
            localStorage['ServerAddress']=serveraddr;
            ws.close() // will be automatically reopened to new address by the onclose() event.
            document.getElementById("apptitle").innerHTML = "Log | " + serveraddr;
            scrollList("New server host: "+serveraddr,"bg-success");
        })
    })

});
function stupidDate(m) {
    var dateString = m.getFullYear() + "." + ("0" + (m.getMonth() + 1)).slice(-2) + "." +
        ("0" + m.getDate()).slice(-2) + " " + ("0" + m.getHours()).slice(-2) + ":" +
        ("0" + m.getMinutes()).slice(-2) + ":" + ("0" + m.getSeconds()).slice(-2) + "." +
        ("00" + m.getMilliseconds()).slice(-3);
    return dateString;
}

function stupidTime(m) {
    var dateString = ("0" + m.getHours()).slice(-2) + ":" +
        ("0" + m.getMinutes()).slice(-2) + ":" + ("0" + m.getSeconds()).slice(-2) + "." +
        ("00" + m.getMilliseconds()).slice(-3);
    return dateString;
}

var initL = 0;
var maxScrollLines=250;
function initList() {
    if (initL ==1) return;
    initL=1;
    var list = document.getElementById("messages");
    if (list == null) console.log("That went bad.");
    for (var i = 0; i < maxScrollLines; i++) {
        var entry = document.createElement("li");
        var text = document.createTextNode("");
        // entry.className = "bg-danger";
        entry.appendChild(text);
        list.appendChild(entry);
    }
    var $cont = $('.panel-body');
    $cont[0].scrollTop = $cont[0].scrollHeight;
}

function scrollList(line, classn) {
    var list = document.getElementById("messages");
    var entry = document.createElement("li");
    // var textnode = document.createTextNode("");
    entry.className = classn;
    // var child = entry.appendChild(textnode);
    entry.innerHTML = line;
    list.appendChild(entry);
    // $(entry).html(line);
    // list.splice(0,1);
    var lis = list.childNodes;
    list.removeChild(lis[0]);

    var $cont = $('.panel-body');
    $cont[0].scrollTop = $cont[0].scrollHeight;
}

var bulkUpdate = 0;

function Log(nam,top,lvl,msg,dat) {
    var ms = parseFloat(dat) * 1000;
    var tim = new Date(ms);

    var clevel = "standard"
    if (lvl == "Fatal") {
        clevel = "bg-danger";
        ctop = "label-danger";
    }
    if (lvl == "Error") {
        clevel = "bg-danger";
        ctop = "label-danger";
    }
    if (lvl == "Warning") {
        clevel = "bg-warning";
        ctop = "label-warning";
    }
    if (lvl == "Info") { 
        clevel = "bg-success";
        ctop = "label-success";
    }
    if (lvl == "Verbose") {
        clevel = "bg-active";
        ctop = "label-default";
    }

    var line = "<span><span class=\"label label-default\">" +
        stupidTime(tim) + "</span> " +
        "<span class=\"label label-primary\">" + nam + "</span> " +
        "<span class=\"label " + ctop + "\">" + top + "</span> " +
        msg + "</span>";

    scrollList(line, clevel);

    var nx=1;
    for (var i=dataM.length-1; i>=0; i--) {
        if (ms - dataM[i][0].getTime() > 60000.0) break;
        if (dataM[i][1] > 0)++nx;
    }
    if (dataM.length > 0) {
        if (ms - dataM[dataM.length-1][0].getTime() > 120000) { // we need a 0 gap
            var p0 = new Date(dataM[dataM.length-1][0].getTime() + 60000);
            var p1 = new Date(ms - 60000);
            dataM.push([p0,0]);
            dataM.push([p1,0]);
        }
    }
    var pointM = [tim, nx];
    dataM.push(pointM);
    dataM.sort(function(a,b) {
        return (a[0].getTime()-b[0].getTime())
    })
    if (dataM.length > 1000) dataM.splice(0,1)

    if (bulkUpdate == 0) drawBasic();

}

var ws;
var reconnectInterval = 1000;
var connected=0;
var wasconnected=0;
var filter={};
if (!localStorage['FilterName']) {
    filter = {
        MsgType: "FilterMsg",
        Name: ".*",
        Topic: ".*", // "ZeroMQ|Calc|Variation",
        Level: ".*", // "Fatal|Error|Warning|Info",
        Msg: ".*", // Msg text,
        Entities: ".*",
        Properties: ".*",
        Value: ".*",
    };
    localStorage['FilterName']=filter["Name"];
    localStorage['FilterLevel']=filter["Level"];
    localStorage['FilterTopic']=filter["Topic"];
    localStorage['FilterMsg']=filter["Msg"];
} else {
    filter = {
        MsgType: "FilterMsg",
        Name: ".*",
        Topic: ".*", // "ZeroMQ|Calc|Variation",
        Level: ".*", // "Fatal|Error|Warning|Info",
        Msg: ".*", // Msg text,
        Entities: ".*",
        Properties: ".*",
        Value: ".*",
    };
    filter["Name"]=localStorage["FilterName"];
    filter["Level"]=localStorage["FilterLevel"];
    filter["Topic"]=localStorage["FilterTopic"];
    filter["Msg"]=localStorage["FilterMsg"];
}

var connect = function() {
    var serverurl = "wss://"+serveraddr

    ws = new WebSocket(serverurl);
    ws.onerror = function(e) {
        console.log('socket error');
    };
    ws.onopen = function(e) {
        console.log('Connection to server '+serveraddr+' opened');
        initList();
        ws.send(JSON.stringify(filter));
        console.log("Filter-update sent.");

        var dat=(Date.now()/1000.0).toString()
        if (wasconnected==0) {
            Log("Client","Websocket","Info","Connected to server "+serveraddr,dat);
            wasconnected=1;
        } else {
            Log("Client","Websocket","Info","Reconnected to server "+serveraddr,dat);
        }
        connected=1;
    }
    ws.onclose = function(e) {
        console.log("onclose");
        var dat=(Date.now()/1000.0).toString()
        if (connected==1) {
            Log("Client","Websocket","Warning","Disconnected from server",dat);
        }
        connected=0;
        setTimeout(connect, reconnectInterval);
    }
    ws.onmessage = function(e) {
            // console.log(e.data);
            var xobj = JSON.parse(e.data);
            if (xobj["MsgType"] == "LogMsg") {
                var lvl = xobj["Level"];
                var top = xobj["Topic"];
                var nam = xobj["Name"];
                Log(nam,top,lvl,xobj["Msg"],xobj["Date"]);
            } else if (xobj["MsgType"] == "LogMsgList") {
                console.log("Filter-update history received: "+xobj["Msgs"].length)
                dataM=[];
                bulkUpdate = 1;
                for (var i=0; i<xobj["Msgs"].length; i++) {
                    Log(xobj["Msgs"][i]["Name"],xobj["Msgs"][i]["Topic"],
                        xobj["Msgs"][i]["Level"],xobj["Msgs"][i]["Msg"],
                        xobj["Msgs"][i]["Date"]);

                }
                bulkUpdate = 0;
                drawBasic();
            } else if (xobj["MsgType"] == "EntityMsg") {
                // console.log("State: " + xobj["Entity"] + ", Property: " + xobj["Property"] + " is: " + xobj["Value"]);
                var st=parseInt(xobj["Value"]);
                if (st==undefined) st=0;
                if (isNaN(st)) st=0;
                if (st<0 || st>100) st=0;
                var pb = document.getElementById('mybar');
                var pbs = st +"%";
                $("#mybar").css("width",pbs);
                $("#mybar").attr("aria-valuenow",st);
                pb.innerHTML=pbs;
            }
        }
}


google.load('visualization', '1', {packages: ['corechart', 'line']});
google.setOnLoadCallback(drawBasicHA);

function drawBasicHA() {
    drawBasic()
    setHeight();
}
function drawBasic() {

      var chartData = new google.visualization.DataTable();
      chartData.addColumn('datetime', 'X');
      chartData.addColumn('number', 'Msgs');

      chartData.addRows(dataM);

      var chartOptions = {
        /* hAxis: {
          title: 'Time',
          titleTextStyle: {
              color: '#428bca',
              italic: false,
          }
      }, */
        vAxis: {
          title: '# Msgs / min',
          titleTextStyle: {
              color: '#428bca',
              italic: false,
          },
      },
      legend: {position: 'none'},
      colors: ['#428bca', '#d9edf7'] // fits default color of bootstrap
      };

      var chart = new google.visualization.AreaChart(document.getElementById('chart_div'));

      chart.draw(chartData, chartOptions);
    }
