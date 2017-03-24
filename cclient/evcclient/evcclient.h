//
//  main.c
//  0mq-test
//
//  Created by Dominik Schloesser on 21/10/15.
//  Copyright © 2015 Dominik Schloesser. All rights reserved.
//

#define LOG_FATAL   0
#define LOG_ERROR   1
#define LOG_WARNING 2
#define LOG_INFO    3
#define LOG_VERBOSE 4

int registerEventCommander(char *name, char *server, int localPort);
int unregisterEventCommander();
int Log(int level, char *topic, char *msg);
int Entity(char *entity, char *property, char *value);
int IntEntity(char *entity, char *property, int value);
int FloatEntity(char *entity, char *property, float value);
int DoubleEntity(char *entity, char *property, double value);
