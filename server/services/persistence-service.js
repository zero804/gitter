/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var env            = require('../utils/env');
var logger         = env.logger;
var mongoose       = require('../utils/mongoose-q');
var winston        = require('../utils/winston');
var nconf          = require("../utils/config");
var shutdown       = require('shutdown');
var mongodbConnString = require('mongodb-connection-string');
var mongodbArbiterDiscover = require('mongodb-arbiter-discovery');
var mongoDogStats  = require('mongodb-datadog-stats');

mongoDogStats.install(mongoose.mongo, {
  statsClient: env.createStatsClient(),
  sampleRate: 0.5
});

// Install inc and dec number fields in mongoose
require('mongoose-number')(mongoose);

var connection = mongoose.connection;

mongoose.set('debug', nconf.get("mongo:logQueries"));

var mongoConnection = nconf.get("mongo:connection");
var MONGO_CONNECTION_OPTIONS = {
  server: {
    keepAlive: 1,
    auto_reconnect: true,
    socketOptions: { keepAlive: 1, connectTimeoutMS: 60000 }
  },
  replset: {
    keepAlive: 1,
    auto_reconnect: true,
    socketOptions: { keepAlive: 1, connectTimeoutMS: 60000 }
  }
};

mongoose.connect(mongodbConnString.mongo(mongoConnection), MONGO_CONNECTION_OPTIONS);

shutdown.addHandler('mongo', 1, function(callback) {
  mongoose.disconnect(callback);
});

var hasConnected = false;

mongoose.connection.on('open', function() {
  hasConnected = true;
  if(nconf.get("mongo:profileSlowQueries")) {

    mongoose.set('debug', function (collectionName, method, query/*, doc, options*/) {
      var collection;

      if(method === 'find' || method === 'findOne') {
        collection = mongoose.connection.db.collection(collectionName);
        collection.find(query, function(err, cursor) {
          if(err) {
            winston.verbose('Explain plan failed', { exception: err });
            return;
          }

          cursor.explain(function(err, plan) {
            if(err) {
              winston.verbose('Explain plan failed', { exception: err });
              return;
            }

            if(plan.cursor === 'BasicCursor') {
              // Make sure that all full scans are removed before going into production!
              winston.warn('Full scan query on ' + collectionName + ' for query ', { query: query, plan: plan });
            }
          });
        });
      }
    });

    var MAX = 50;
    connection.setProfiling(1, MAX, function() {});
  }

});

var autodiscoveryAttempts = 0;
function attemptAutoDiscoveryConnection(err) {
  logger.error('Attempting autodiscovery as connection failed');
  function die(err) {
    console.error(err);
    console.error(err.stack);
    shutdown.shutdownGracefully(1);
  }

  if(autodiscoveryAttempts > 0) {
    logger.error('No autodiscovery already failed. Aborting connection');
    return die(err);
  }

  autodiscoveryAttempts++;

  var autoDiscoveryHost = nconf.get('mongo:autoDiscovery:host');
  var autoDiscoveryPort = nconf.get('mongo:autoDiscovery:port') || 27017;
  var replicaSet = mongoConnection.options && mongoConnection.options.replicaSet;

  if (!autoDiscoveryHost) {
    logger.error('No autodiscovery host available, unable to autodiscover');
    return die(err);
  }

  logger.error('Autodiscovery via ' + autoDiscoveryHost + ":" + autoDiscoveryPort);

  mongodbArbiterDiscover({
    host: autoDiscoveryHost,
    port: autoDiscoveryPort,
    mongo: mongoose.mongo,
    replicaSet: replicaSet
  }, function(err, hosts) {
    if(err) return die(err);

    mongoConnection.hosts = hosts;
    mongoose.connect(mongodbConnString.mongo(mongoConnection), MONGO_CONNECTION_OPTIONS);
  });
}

connection.on('error', function(err) {
  winston.info("MongoDB connection error", { exception: err });
  console.error(err);
  if(err.stack) console.log(err.stack);

  if (hasConnected) return;
  attemptAutoDiscoveryConnection(err);
});

function createExports(schemas) {
  var ex = {
    schemas: {
    }
  };

  Object.keys(schemas).forEach(function(key) {
    var module = schemas[key];
    var m = module.install(mongoose);

    ex[key] = m.model;
    ex.schemas[key + 'Schema'] = m.schema;
  });

  return ex;
}

module.exports = createExports({
  User: require('./persistence/user-schema'),
  UserTroupeLastAccess: require('./persistence/user-troupe-last-access-schema'),
  UserTroupeFavourites: require('./persistence/user-troupe-favourites-schema'),
  Troupe: require('./persistence/troupe-schema'),
  UserTroupeSettings: require('./persistence/user-troupe-settings-schema'),
  UserSettings: require('./persistence/user-settings-schema'),
  ChatMessage: require('./persistence/chat-message-schema'),
  Event: require('./persistence/event-schema'),
  OAuthClient: require('./persistence/oauth-client-schema'),
  OAuthCode: require('./persistence/oauth-code-schema'),
  OAuthAccessToken: require('./persistence/oauth-access-token-schema'),
  PushNotificationDevice: require('./persistence/push-notification-device-schema'),
  UriLookup: require('./persistence/uri-lookup-schema'),
  Subscription: require('./persistence/subscription-schema')
});

var events = require("./persistence-service-events");
events.install(module.exports);
