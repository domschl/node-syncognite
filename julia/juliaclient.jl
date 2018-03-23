using ZMQ
using JSON

struct ZmqState
    name::String
    ctx::Context
    logpubsock::Socket
    reqsock::Socket
    repcmdsock::Socket
end

function registerEventCommander(name::String, server::String, listeningport::Int64=5481) 
    ctx = Context()
    logpubsock = Socket(ctx, PUB)
    reqsock = Socket(ctx, REQ)
    repcmdsock = Socket(ctx, REP)

    ZMQ.connect(reqsock, server)

    ZMQ.bind(logpubsock, "tcp://*:$listeningport")
    listeningport2 = listeningport + 1
    ZMQ.bind(repcmdsock, "tcp://*:$listeningport2")
    
    hostname = gethostname()
    global remoteev = "tcp://$hostname:$listeningport"
    global remotecmd = "tcp://$hostname:$listeningport2"
    cmd = Dict("MsgType" => "RegisterEventCommander",
                "Name" => name,
                "EventAddress" => remoteev,
                "CmdAddress" => remotecmd)
    js = JSON.json(cmd)            
    println("Sending: " * js)
    ZMQ.send(reqsock, Message(js))
    msg = unsafe_string(ZMQ.recv(reqsock))
    println(msg)
    return ZmqState(name, ctx, logpubsock, reqsock, repcmdsock)
end

function unregisterEventCommander(zst::ZmqState)
    ZMQ.close(zst.logpubsock)
    ZMQ.close(zst.reqsock)
    ZMQ.close(zst.repcmdsock)
    ZMQ.close(zst.ctx)
    name = zst.name
    println("$name closed")
end

function Log(zst::ZmqState, level::String, 
                topic::String, message::String)
    date = time()
    cmd = Dict("MsgType" => "LogMsg", "Date" => date, "Level" => level,
       "Name" => zst.name, "Topic" => topic, "Msg" => message)
    js = JSON.json(cmd)
    ZMQ.send(zst.logpubsock, Message(js))
end

function Entity(zst::ZmqState, entity::String, property::String, value::String)
    date = time()
    cmd = Dict("MsgType" => "EntityMsg", "Date" => date, "Entity" => entity,
        "Property" => property, "Value" => value)
    js = JSON.json(cmd)
    ZMQ.send(zst.logpubsock, Message(js))
end

zst = registerEventCommander("julia", "tcp://localhost:5101")
Log(zst, "Warning", "Lib-tester", "Sending this from Julia!")
Entity(zst, "CPU", "Power", "50")
unregisterEventCommander(zst)
