//
//  main.c
//  0mq-test
//
//  Created by Dominik Schloesser on 21/10/15.
//  Copyright © 2015 Dominik Schloesser. All rights reserved.
//


#include <zmq.h>
#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <time.h>
#include <sys/time.h>

#ifdef __MACH__
#include <mach/clock.h>
#include <mach/mach.h>
#endif

#include "evcclient.h"

static char *logLevel[] = {"Fatal","Error","Warning","Info","Verbose"};

void *contextZ;

void *requesterLog;
void *pubLog;
void *repCmd;
char nameP[128];

void logTimestamp(struct timespec *pts) {
#ifdef __MACH__ // OS X does not have clock_gettime, use clock_get_time
    clock_serv_t cclock;
    mach_timespec_t mts;
    host_get_clock_service(mach_host_self(), CALENDAR_CLOCK, &cclock);
    clock_get_time(cclock, &mts);
    mach_port_deallocate(mach_task_self(), cclock);
    pts->tv_sec = mts.tv_sec;
    pts->tv_nsec = mts.tv_nsec;
#else
    clock_gettime(CLOCK_REALTIME, pts);
#endif
}

int registerEventCommander(char *name, char *server, int localPort) {
    int rc;

    char hostname[1024];
    char regcli1[2048];
    char regcli2[2048];
    char regloc1[128];
    char regloc2[128];

    if (localPort==0) localPort=5431;

    hostname[1023] = '\0';
    gethostname(hostname, 1023);

    sprintf(regcli1,"tcp://%s:%d",hostname,localPort);
    sprintf(regcli2,"tcp://%s:%d",hostname,localPort+1);
    sprintf(regloc1,"tcp://*:%d",localPort);
    sprintf(regloc2,"tcp://*:%d",localPort+1);

    printf("%s %s %s\n",server,regcli1,regcli2);
    contextZ = zmq_ctx_new ();

    strcpy(nameP,name);
    requesterLog = zmq_socket(contextZ, ZMQ_REQ);
    rc=zmq_connect(requesterLog, server);
    if (rc!=0) {
        printf("Couldn't connect to %s: %s\n", server, strerror (errno));
        return rc;
    }

    pubLog = zmq_socket(contextZ, ZMQ_PUB);
    rc = zmq_bind(pubLog, regloc1);
    if (rc == -1) {
        printf("Couldn't pub-bind to %s: %s\n", regloc1, strerror (errno));
        return rc;
    }

    repCmd = zmq_socket(contextZ, ZMQ_REP);
    rc = zmq_bind(repCmd, regloc2);
    if (rc == -1) {
        printf("Couldn't rep-bind to %s: %s\n", regloc2, strerror (errno));
        return rc;
    }
    printf("Sending...\n");
    char reply[256];
    char cmd[256];
    sprintf(cmd,"{ \"MsgType\": \"RegisterEventCommander\", \"Name\": \"%s\", \"EventAddress\": \"%s\", \"CmdAddress\": \"%s\" }", name, regcli1, regcli2 );
    rc=zmq_send (requesterLog, cmd, strlen(cmd), 0);
    if (rc == -1) {
        printf("Couldn't send register msg to %s: %s\n", server, strerror (errno));
        zmq_close(requesterLog);
        return rc;
    }
    printf("Sent. Receiving...\n");
    rc=zmq_recv (requesterLog, reply, 255, 0);
    if (rc == -1) {
        printf("Couldn't receive register reply from %s: %s\n", server, strerror (errno));
        zmq_close(requesterLog);
        return rc;
    }
    reply[rc]=0;
    printf("Reply: %s\n",reply);
    zmq_close(requesterLog);
    return 0;
}

int unregisterEventCommander() {
    zmq_close(pubLog);
    zmq_close(repCmd);
    zmq_ctx_destroy(contextZ);
    return 0;
}

char *logLevelToString(int level) {
    if (level>=0 && level <=4) return logLevel[level];
    return NULL;
}

int Log(int level, char *topic, char *msg) {
    struct timespec ts;
    char logmsg[2048];
    char timestr[64];
    int rc;
    if (strlen(topic) > 64) {
        printf("Maximum topic size exceeded!\n");
        return -1;
    }
    if (strlen(msg) > 1024) {
        printf("Maximum message size exceeded!\n");
        return -1;
    }
    logTimestamp(&ts);
    sprintf(timestr,"%ld.%03ld",(long)ts.tv_sec,(long)ts.tv_nsec / 1000000);
    sprintf(logmsg,"{ \"MsgType\": \"LogMsg\", \"Date\": %s, \"Level\": \"%s\", \"Name\": \"%s\", \"Topic\": \"%s\", \"Msg\": \"%s\" }",timestr, logLevelToString(level), nameP, topic, msg);
    rc = zmq_send (pubLog, logmsg, strlen (logmsg), 0);
    return rc;
}

int Entity(char *entity, char *property, char *value) {
    struct timespec ts;
    char statemsg[2048];
    char timestr[64];
    int rc;
    if (strlen(entity) > 256) {
        printf("Maximum entity size exceeded!\n");
        return -1;
    }
    if (strlen(property) > 256) {
        printf("Maximum property size exceeded!\n");
        return -1;
    }
    if (strlen(value) > 1024) {
        printf("Maximum value size exceeded!\n");
        return -1;
    }
    logTimestamp(&ts);
    sprintf(timestr,"%ld.%03ld",(long)ts.tv_sec,(long)ts.tv_nsec / 1000000);
    sprintf(statemsg,"{ \"MsgType\": \"EntityMsg\", \"Date\": \"%s\", \"Entity\": \"%s\", \"Property\": \"%s\", \"Value\": \"%s\" }",timestr, entity, property, value);
    rc = zmq_send (pubLog, statemsg, strlen (statemsg), 0);
    return rc;
}

int IntEntity(char *entity, char *property, int value) {
    char str[256];
    sprintf(str,"%d",value);
    return Entity(entity,property,str);
}
int FloatEntity(char *entity, char *property, float value) {
    char str[256];
    sprintf(str,"%f",value);
    return Entity(entity,property,str);
}
int DoubleEntity(char *entity, char *property, double value) {
    char str[256];
    sprintf(str,"%f",value);
    return Entity(entity,property,str);
}
