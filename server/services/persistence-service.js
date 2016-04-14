"use strict";

var env            = require('gitter-web-env');
var winston        = env.logger;
var mongoose       = require('../utils/mongoose-q');
var debug          = require('debug')('gitter:persistence-service');
var mongoDebug     = require('node-mongodb-debug-log');

// Install inc and dec number fields in mongoose
require('mongoose-number')(mongoose);

/* Establishes a connection to the mongodb server, with fallback, etc */
env.mongo.configureMongoose(mongoose);

var connection = mongoose.connection;

if (debug.enabled) {
  mongoose.set('debug', true);
}

mongoDebug.install(mongoose.mongo, {
  debugName: 'gitter:mongo',
  slowLogMS: 10
});

connection.on('error', function(err) {
  winston.info("MongoDB connection error", { exception: err });
  console.error(err);
  if(err.stack) console.log(err.stack);
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
  Identity: require('./persistence/identity-schema'),
  UserTroupeLastAccess: require('./persistence/user-troupe-last-access-schema'),
  UserTroupeFavourites: require('./persistence/user-troupe-favourites-schema'),
  Troupe: require('./persistence/troupe-schema'),
  TroupeUser: require('./persistence/troupe-user-schema'),
  UserSettings: require('./persistence/user-settings-schema'),
  ChatMessage: require('./persistence/chat-message-schema'),
  Event: require('./persistence/event-schema'),
  OAuthClient: require('./persistence/oauth-client-schema'),
  OAuthCode: require('./persistence/oauth-code-schema'),
  OAuthAccessToken: require('./persistence/oauth-access-token-schema'),
  PushNotificationDevice: require('./persistence/push-notification-device-schema'),
  UriLookup: require('./persistence/uri-lookup-schema'),
  Subscription: require('./persistence/subscription-schema'),
  FeatureToggle: require('./persistence/feature-toggle-schema')
});

var events = require("./persistence-service-events");
events.install(module.exports);
