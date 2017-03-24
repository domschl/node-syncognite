var MongoClient = require('mongodb').MongoClient;
var CLog = require('./node-syncognite-util.js');

var mongoDb = 0;
var mongoLogCollection = "Log";
var mongoEntityCollection = "Entity";
var mongoEntitySpace = "EntitySpace";

var Mongo = function() {};

Mongo.prototype.init = function(md) {
    var mongoDbHost = 'mongodb://localhost:27017/LogArchive';
    var rem=0;
    MongoClient.connect(mongoDbHost, function(err, db) {
        if (err) {
            CLog.console("Failed to connect to mongodb database");
            throw err;
        }
        mongoDb = db;
        CLog.console("Mongodb open");
        var options = {
            //          sort: {'Timestamp': -1},
            //          limit: 200
        }
        var searchcrt = {};
        mongoDb.collection(mongoEntitySpace).find(searchcrt, options).toArray(function(err, ents) {
            if (err) {
                CLog.console("EntitySpace search yielded err!");
            } else {
                for (i = 0; i < ents.length; i++) {
                    var ent = ents[i];
                    var dobj = entityStates[ent.Entity];
                    if (dobj == undefined) { // New entity:
                        entityStates[ent.Entity] = {}
                    }
                    if (entityStates[ent.Entity][ent.Property] == undefined) {
                        // CLog.console("Remembering: " + ent.Entity + "/" + ent.Property);
                        rem = rem + 1;
                        entityStates[ent.Entity][ent.Property] = {};
                    }
                }
                CLog.console("Remembered entities: "+rem.toString());
            }
        });
    });
}

Mongo.prototype.db = function() {
    return mongoDb;
}

Mongo.prototype.lc = function() {
    return mongoLogCollection;
}

Mongo.prototype.ec = function() {
    return mongoEntityCollection;
}

Mongo.prototype.es = function() {
    return mongoEntitySpace;
}

module.exports = new Mongo();
