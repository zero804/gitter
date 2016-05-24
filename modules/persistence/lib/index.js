"use strict";

var env           = require('gitter-web-env');
var winston       = env.logger;
var errorReporter = env.errorReporter;
var mongoose      = require('gitter-web-mongoose-bluebird');
var debug         = require('debug')('gitter:infra:persistence-service');
var mongoDebug    = require('node-mongodb-debug-log');

// Install inc and dec number fields in mongoose
require('mongoose-number')(mongoose);

/* Establishes a connection to the mongodb server, with fallback, etc */
env.mongo.configureMongoose(mongoose);

var connection = mongoose.connection;

if (debug.enabled) {
  mongoose.set('debug', true);
}

mongoDebug.install(mongoose.mongo, {
  debugName: 'gitter:infra:mongo',
  slowLogMS: 10
});

connection.on('error', function(err) {
  winston.info("MongoDB connection error", { exception: err });
  errorReporter(err, { connection_error:true }, { module: 'persistence' });
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
  User: require('./schemas/user-schema'),
  Identity: require('./schemas/identity-schema'),
  UserTroupeLastAccess: require('./schemas/user-troupe-last-access-schema'),
  UserTroupeFavourites: require('./schemas/user-troupe-favourites-schema'),
  Troupe: require('./schemas/troupe-schema'),
  TroupeUser: require('./schemas/troupe-user-schema'),
  UserSettings: require('./schemas/user-settings-schema'),
  ChatMessage: require('./schemas/chat-message-schema'),
  Event: require('./schemas/event-schema'),
  OAuthClient: require('./schemas/oauth-client-schema'),
  OAuthCode: require('./schemas/oauth-code-schema'),
  OAuthAccessToken: require('./schemas/oauth-access-token-schema'),
  PushNotificationDevice: require('./schemas/push-notification-device-schema'),
  UriLookup: require('./schemas/uri-lookup-schema'),
  Subscription: require('./schemas/subscription-schema'),
  FeatureToggle: require('./schemas/feature-toggle-schema'),
  SecurityDescriptor: require('./schemas/security-descriptor-schema'),
});
