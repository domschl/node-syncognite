//
//  main.c
//  0mq-test
//
//  Created by Dominik Schloesser on 21/10/15.
//  Copyright © 2015 Dominik Schloesser. All rights reserved.
//


#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#include "evcclient.h"

#define MAX_PARM 256
char serverad[MAX_PARM];
char portno[MAX_PARM];
#define OPT_HELP 0x00000001
char *sargs[]={"-s","--server",serverad,"-p","--port",portno};
int opts=0;
char *sopts[]={"-h","--help"};
int nopts[]={OPT_HELP};

void parseArgs(int argc, char *argv[]) {
    int i,j;
    int na,no,nn;
    opts=0;
    na = sizeof(sargs) / sizeof(char *);
    no = sizeof(sopts) / sizeof(char *);
    nn = sizeof(nopts) / sizeof(int);
    if ((na % 3) != 0) {
        printf("NA table inconsistent!");
        exit(-1);
    }
    if ((no % 2) != 0) {
        printf("NO table inconsistent!");
        exit(-1);
    }
    if (no/2 != nn) {
        printf("NN table inconsistent!");
        exit(-1);
    }
    for (j=2; j<sizeof(sargs)/sizeof(char *); j+=3) {
        strcpy(sargs[j],"");
    }
    for (i=1; i<argc; i++) {
        for (j=0; j<sizeof(opts) / sizeof(char *); j++) {
            if (!strcmp(sopts[j],argv[i])) opts |= nopts[j/2];
        }
        for (j=0; j<sizeof(sargs) / sizeof(char *); j+=3) {
            if (i+1 >= argc) break;
            if (strlen(argv[i+1]) > MAX_PARM-1) {
                printf("Argument for %s too long",sargs[j]);
                exit(-1);
            }
            if (!strcmp(sargs[j],argv[i])) strcpy(sargs[j+2],argv[i+1]);
            if (!strcmp(sargs[j+1],argv[i])) strcpy(sargs[j+2],argv[i+1]);
        }
    }
}



int main(int argc, char *argv[]) {
    int rc;
    char regsrv[2028];

    parseArgs(argc,argv);

    sprintf(regsrv,"tcp://%s:%s",serverad,portno);

    rc=registerEventCommander("C-Kernel",regsrv,5430);
    if (rc<0) exit(-1);

    sleep(1);

    Log(LOG_INFO,"Job","We started up!  སྟོན་པ་ཉིད།");
    char msg[256];
    char topic[256];
    int level;
    float cl;
    for (int i=0; i<3; i++) {
        IntEntity("CKernel","C-For-Loop",i);
        cl=(float)rand()/(float)RAND_MAX;
        sprintf(msg,"Calculation: %f",cl);
        switch (rand()%20) {
            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
            case 8:
                level=LOG_VERBOSE; strcpy(topic,"Calc"); break;
            case 9:
            case 10:
            case 11:
            case 12:
            case 13:
                level=LOG_INFO; strcpy(topic,"Calc, Success"); break;
            case 14:
            case 15:
            case 16:
                level=LOG_WARNING; strcpy(topic,"Variation"); break;
            case 17:
            case 18:
                level=LOG_ERROR; strcpy(topic,"Attack"); break;
            case 19: level=LOG_FATAL; strcpy(topic,"Kernel-breach"); break;
            default: level=LOG_FATAL; strcpy(topic,"Kernel-breach"); break;
        }
        Log(level,topic,msg);
        usleep(100000);
    }
    Log(LOG_INFO,"Chatter","Anyway, we have a loooot of things to display, and let's see how that works out!");
    Log(LOG_WARNING,"Job","GOING DOWN!");
    sleep(1);
    Log(LOG_FATAL,"Job","Dead!");
    unregisterEventCommander();
    sleep(1);
    exit(0);
}
