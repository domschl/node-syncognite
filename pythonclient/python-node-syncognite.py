
from __future__ import unicode_literals
import json
import time
import zmq
import platform
import sys


class EvCom:
    def __init__(self, verbose=False):
        self.verbose = verbose

    def bindTo(self, socket, port):
        print("binding:", port)
        sys.stdout.flush()
        try:
            addr = "tcp://*:"+str(port)
            socket.bind(addr)
            return True
        except ValueError:
            if self.verbose:
                print("Err:", ValueError)
            return False

    def registerEventCommander(self, name, server, listenport=5401):
        self.name = name
        self.context = zmq.Context()
        self.logpubsock = self.context.socket(zmq.PUB)
        self.reqsock = self.context.socket(zmq.REQ)
        self.repcmdsock = self.context.socket(zmq.REP)

        myHostname = platform.node()

        port1 = listenport
        port2 = listenport + 1

        try:
            self.reqsock.connect(server)
        except ValueError:
            if self.verbose:
                print("Cannot connect to server at "+server)
                sys.stdout.flush()
            return False

        self.bindTo(self.logpubsock, port1)
        self.bindTo(self.repcmdsock, port2)
        if port1 is False or port2 is False:
            if self.verbose:
                print("Failed to bind local port(s)")
                sys.stdout.flush()
            return False

        remoteev = "tcp://"+myHostname+":"+str(port1)
        remotecmd = "tcp://"+myHostname+":"+str(port2)
        cmd = {'MsgType': "RegisterEventCommander", 'Name': name,
               'EventAddress': remoteev,
               'CmdAddress': remotecmd}
        js = json.dumps(cmd)
        self.reqsock.send_string(js)
        if self.verbose:
            print("Waiting for reg feedback...")
            sys.stdout.flush()
        message = self.reqsock.recv()
        if self.verbose:
            print(message)
            sys.stdout.flush()
        return True

    def unregisterEventCommander(self):
        try:
            self.logpubsock.close()
            self.reqsock.close()
            self.repcmdsock.close()
            self.context.destroy()
            return True
        except ValueError:
            if self.verbose:
                print("Failure during unregister.")
                sys.stdout.flush()
            return False

    def Log(self, level, topic, message):
        date = time.time()
        cmd = {'MsgType': "LogMsg", 'Date': date, 'Level': level,
               'Name': self.name, 'Topic': topic, 'Msg': message}
        js = json.dumps(cmd)
        self.logpubsock.send_string(js)

    def Entity(self, entity, propert, value):
        date = time.time()
        cmd = {'MsgType': "EntityMsg", 'Date': date, 'Entity': entity,
               'Property': propert, 'Value': value}
        js = json.dumps(cmd)
        self.logpubsock.send_string(js)


if __name__ == "__main__":
    ec = EvCom(verbose=True)
    if ec.registerEventCommander("Python", "tcp://localhost:5101", listenport=5546) is True:
        print("Successfully registered EventCommander")
    else:
        print("Failed to register!")
        quit()
    time.sleep(1)
    ec.Log("Info", "System", "Startup complete")
    # ec.Log("Verbose", "System", "Doing nothing much")
    # ec.Log("Warning", "Task", "Looks bad!")
    # ec.Log("Fatal", "System", "OMG!")
    # ec.Entity("CPU", "Power", 50)
    ec.Entity("FHEM", "property", "value")
    ec.Entity("switch/lamp","state", "on")
    time.sleep(1)
    if ec.unregisterEventCommander() is True:
        print("Successfully unregistered")
    else:
        print("Something went wrong with unregister!")
