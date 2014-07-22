/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var mongoose      = require('../utils/mongoose-q');
var Schema        = mongoose.Schema;
var ObjectId      = Schema.ObjectId;
var mongooseUtils = require('../utils/mongoose-utils');
var appEvents     = require("../app-events");
var _             = require("underscore");
var winston       = require('../utils/winston');
var nconf         = require("../utils/config");
var shutdown      = require('shutdown');
var Fiber         = require("../utils/fiber");
var assert        = require("assert");

var restSerializer = require('../serializers/rest-serializer');
var serializeModel = restSerializer.serializeModel;

// Install inc and dec number fields in mongoose
require('mongoose-number')(mongoose);

var connection = mongoose.connection;

//mongoose.mongo = require('mongodb');
mongoose.set('debug', nconf.get("mongo:logQueries"));

mongoose.connect(nconf.get("mongo:url"), {
  server: {
    auto_reconnect: true,
    socketOptions: { keepAlive: 1, connectTimeoutMS: 30000 }
  },
  replset: {
    auto_reconnect: true,
    socketOptions: { keepAlive: 1, connectTimeoutMS: 20000 }
  }
});

shutdown.addHandler('mongo', 1, function(callback) {
  mongoose.disconnect(callback);
});

mongoose.connection.on('open', function() {
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

connection.on('error', function(err) {
  winston.info("MongoDB connection error", { exception: err });
  console.error(err);
  if(err.stack) console.log(err.stack);
});

// --------------------------------------------------------------------
// Utility serialization stuff
// --------------------------------------------------------------------

function serializeEvent(url, operation, model, callback) {
  winston.verbose("Serializing " + operation + " to " + url);

  serializeModel(model, function(err, serializedModel) {
    if(err) {
      winston.error("Silently failing model event: ", { exception: err, url: url, operation: operation });
    } else {
      appEvents.dataChange2(url, operation, serializedModel);
    }

    if(callback) callback();
  });
}

// --------------------------------------------------------------------
// Schemas
// --------------------------------------------------------------------
var UnconfirmedEmailSchema = new Schema({
  email:            { type: String },
  confirmationCode: { type: String }
});
UnconfirmedEmailSchema.schemaTypeName = 'UserEmailSchema';

var UserSchema = new Schema({
  displayName: { type: String },
  emails: [String],                            // Secondary email addresses
  username: { type: String, required: true },
  confirmationCode: {type: String },
  gravatarImageUrl: { type: String },
  lastTroupe: ObjectId,
  googleRefreshToken: String,
  githubToken: { type: String },
  githubUserToken: { type: String }, // The scope for this token will always be 'user'
  githubId: {type: Number },
  permissions: {
    createRoom: { type: Boolean, 'default': true }
  },
  githubScopes: { type: Schema.Types.Mixed },
  state: { type: String },
  stripeCustomerId: { type: String },
  _tv: { type: 'MongooseNumber', 'default': 0 }
});

// UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ githubId: 1 }, { unique: true, sparse: true }); // TODO: does this still need to be sparse?
UserSchema.index({ username: 1 }, { unique: true /*, sparse: true */});
UserSchema.index({ stripeCustomerId: 1 }, { unique: true, sparse: true });
// UserSchema.index({ "emails.email" : 1 }, { unique: true, sparse: true });
UserSchema.schemaTypeName = 'UserSchema';

var LEGACY_DEFAULT_SCOPE = {'user': 1, 'user:email': 1, 'user:follow':1, 'repo':1, 'public_repo': 1};

UserSchema.methods.hasGitHubScope = function(scope) {
  var githubToken = this.githubToken;
  var githubScopes = this.githubScopes;
  var githubUserToken = this.githubUserToken;

  if(!githubUserToken && !githubToken) {
    return false;
  }

  // Get the simple case out the way
  if(githubUserToken && (scope === 'user' ||
             scope === 'user:email'||
             scope === 'user:follow')) {
    return true;
  }

  function hasScope() {
    for(var i = 0; i < arguments.length; i++) {
      if(githubScopes[arguments[i]]) return true;
    }
    return false;
  }

  if(!githubScopes) {
    if(githubToken) {
      return !!LEGACY_DEFAULT_SCOPE[scope];
    }
    // Legacy users will need to reauthenticate unfortunately
    return false;
  }

  // Crazy github rules codified here....
  switch(scope) {
    case 'notifications': return hasScope('notifications', 'repo');
    case 'user:follow': return hasScope('user:follow', 'user');
    case 'user:email': return hasScope('user:email', 'user');
    case 'public_repo': return hasScope('public_repo', 'repo');
    case 'repo:status': return hasScope('repo:status', 'repo');
  }

  // The less crazy case
  return !!githubScopes[scope];
};

UserSchema.methods.getGitHubScopes = function() {
  if(!this.githubScopes) {
    if(this.githubUserToken) {
      return Object.keys(LEGACY_DEFAULT_SCOPE);
    } else {
      return [];
    }
  }

  var scopes = Object.keys(this.githubScopes);
  if(!this.githubUserToken) {
    return scopes;
  }

  return scopes.concat(['user', 'user:email', 'user:follow']);
};

UserSchema.methods.getGitHubToken = function(scope) {
  if(!scope) return this.githubToken || this.githubUserToken;

  switch(scope) {
    case 'user':
    case 'user:email':
    case 'user:follow':
      return this.githubUserToken || this.githubToken;
  }

  return this.githubToken || this.githubUserToken;
};


UserSchema.methods.isMissingTokens = function() {
  return !this.githubToken && !this.githubUserToken;
};


UserSchema.methods.destroyTokens = function() {
  this.githubToken = null;
  this.githubScopes = { };
  this.githubUserToken = null;
};


UserSchema.methods.getDisplayName = function() {
  return this.displayName || this.username || this.email && this.email.split('@')[0] || "Unknown";
};

UserSchema.methods.getFirstName = function() {
  if(this.displayName) {
    var firstName = this.displayName.split(/\s+/)[0];
    if(firstName) return firstName;
  }

  if(this.username) {
    return this.username;
  }

  if(this.email) {
    return this.email.split('@')[0];
  }

  return "Unknown";
};


UserSchema.methods.getAllEmails = function() {
  return [this.email].concat(this.emails);
};

UserSchema.methods.getHomeUri = function() {
  return this.username ? this.username : "one-one/" + this.id;
};

UserSchema.methods.getHomeUrl = function() {
  return '/' + this.getHomeUri();
};

UserSchema.methods.isConfirmed = function() {
  assert(this.status, 'User object does not have a status attribute. Did you select this field?');
  return this.status !== 'UNCONFIRMED';
};

UserSchema.methods.hasUsername = function() {
  return !!this.username;
};

UserSchema.methods.hasPassword = function() {
  return !!this.passwordHash;
};

UserSchema.methods.hasEmail = function(email) {
  return this.email === email || this.emails.some(function(e) { return e === email; });
};

var UserLocationHistorySchema = new Schema({
  userId: ObjectId,
  timestamp: Date,
  coordinate: {
      lon: Number,
      lat: Number
  },
  speed: Number
});
UserLocationHistorySchema.index({ userId: 1 });
UserLocationHistorySchema.schemaTypeName = 'UserLocationHistorySchema';


// troupes: { troupeId: Date }
var UserTroupeLastAccessSchema = new Schema({
  userId: ObjectId,
  troupes: Schema.Types.Mixed
});
UserTroupeLastAccessSchema.index({ userId: 1 });
UserTroupeLastAccessSchema.schemaTypeName = 'UserTroupeLastAccessSchema';


var UserTroupeFavouritesSchema = new Schema({
  userId: { type: ObjectId },
  favs: Schema.Types.Mixed
});
UserTroupeFavouritesSchema.index({ userId: 1 });
UserTroupeFavouritesSchema.schemaTypeName = 'UserTroupeFavourites';

//
// User in a Troupe
//
var TroupeUserSchema = new Schema({
  userId: { type: ObjectId },
  deactivated: { type: Boolean },
  lurk: { type: Boolean },
  /** Lurk settings
    *  false, undefined: no lurking
    *  true: lurking
    */
});
TroupeUserSchema.schemaTypeName = 'TroupeUserSchema';

var TroupeBannedUserSchema = new Schema({
  userId: { type: ObjectId },
  dateBanned: { type: Date, "default": Date.now },
  bannedBy: { type: ObjectId }
});
TroupeBannedUserSchema.schemaTypeName = 'TroupeBannedUserSchema';
//
// A Troupe
//
var TroupeSchema = new Schema({
  name: { type: String },
  topic: { type: String, 'default':'' },
  uri: { type: String },
  lcUri: { type: String, 'default': function() { return this.uri ? this.uri.toLowerCase() : null; }  },
  githubType: { type: String, 'enum': ['REPO', 'ORG', 'ONETOONE', 'REPO_CHANNEL', 'ORG_CHANNEL', 'USER_CHANNEL'], required: true },
  status: { type: String, "enum": ['ACTIVE', 'DELETED'], "default": 'ACTIVE'},
  oneToOne: { type: Boolean, "default": false },
  users: [TroupeUserSchema],
  bans: [TroupeBannedUserSchema],
  parentId: { type: ObjectId, required: false },
  ownerUserId: { type: ObjectId, required: false }, // For channels under a user /suprememoocow/custom
  security: { type: String, /* WARNING: validation bug in mongo 'enum': ['PRIVATE', 'PUBLIC', 'INHERITED'], required: false */ }, // For REPO_CHANNEL, ORG_CHANNEL, USER_CHANNEL
  dateDeleted: { type: Date },
  dateLastSecurityCheck: { type: Date },
  noindex: { type: Boolean, 'default': false},
  _nonce: { type: Number },
  _tv: { type: 'MongooseNumber', 'default': 0 }
});
TroupeSchema.schemaTypeName = 'TroupeSchema';

TroupeSchema.path('security').validate(function (value) {
  return !value || value === 'PRIVATE' || value === 'PUBLIC' || value === 'INHERITED';
}, 'Invalid security');

// Ideally we should never search against URI, only lcURI
TroupeSchema.index({ uri: 1 }, { unique: true, sparse: true });
TroupeSchema.index({ lcUri: 1 }, { unique: true, sparse: true });
TroupeSchema.index({ parentId: 1 });
TroupeSchema.index({ ownerUserId: 1 });
TroupeSchema.index({ "users.userId": 1 });
TroupeSchema.index({ "users.userId": 1,  "users.deactivated": 2 });
TroupeSchema.pre('save', function (next) {
  this.lcUri =  this.uri ? this.uri.toLowerCase() : null;
  next();
});

TroupeSchema.methods.getUserIds = function() {
  return this.users.map(function(troupeUser) { return troupeUser.userId; });
};

TroupeSchema.methods.findTroupeUser = function(userId) {
  var user = _.find(this.users, function(troupeUser) {
    return "" + troupeUser.userId == "" + userId;
  });

  return user;
};


TroupeSchema.methods.containsUserId = function(userId) {
  return !!this.findTroupeUser(userId);
};

TroupeSchema.methods.getOtherOneToOneUserId = function(knownUserId) {
  assert(this.oneToOne, 'getOtherOneToOneUserId should only be called on oneToOne troupes');
  assert(knownUserId, 'knownUserId required');

  var troupeUser = _.find(this.users, function(troupeUser) {
    return "" + troupeUser.userId != "" + knownUserId;
  });

  return troupeUser && troupeUser.userId;
};

TroupeSchema.methods.addUserById = function(userId, options) {
  assert(!this.oneToOne);

  var exists = this.users.some(function(user) { return user.userId == userId; });
  if(exists) {
    throw new Error("User already exists in this troupe.");
  }

  var raw = { userId: userId };
  if(options && 'lurk' in options) {
    raw.lurk = options.lurk;
  }

  // TODO: disable this methods for one-to-one troupes
  var troupeUser = new TroupeUser(raw);

  this.post('save', function(postNext) {
    var f = new Fiber();

    var url = "/rooms/" + this.id + "/users";
    serializeEvent(url, "create", troupeUser, f.waitor());

    var userUrl = "/user/" + userId + "/rooms";
    serializeEvent(userUrl, "create", this, f.waitor());



    f.all().then(function() { postNext(); }).fail(function(err) { postNext(err); });
  });

  return this.users.push(troupeUser);
};

function serializeOneToOneTroupeEvent(userId, operation, model, callback) {
  var oneToOneUserUrl = '/user/' + userId + '/rooms';

  var strategy = new restSerializer.TroupeStrategy({ currentUserId: userId });

  restSerializer.serialize(model, strategy, function(err, serializedModel) {
    if(err) return callback(err);

    appEvents.dataChange2(oneToOneUserUrl, operation, serializedModel);
    callback();
  });
}

TroupeSchema.methods.removeUserById = function(userId) {
  assert(userId);

  winston.verbose("Troupe.removeUserById", { userId: userId, troupeId: this.id });

  // TODO: disable this methods for one-to-one troupes
  var troupeUser = _.find(this.users, function(troupeUser){ return troupeUser.userId == userId; });

  if(troupeUser) {
    // TODO: unfortunately the TroupeUser middleware remove isn't being called as we may have expected.....
    this.post('save', function(postNext) {
      var f = new Fiber();

      if(!this.oneToOne) {
        /* Dont mark the user as having been removed from the room */
        var url = "/rooms/" + this.id + "/users";
        serializeEvent(url, "remove", troupeUser, f.waitor());

        var userUrl = "/user/" + userId + "/rooms";
        serializeEvent(userUrl, "remove", this, f.waitor());

        // TODO: move this in a remove listener somewhere else in the codebase
        appEvents.userRemovedFromTroupe({ troupeId: this.id, userId: troupeUser.userId });
      } else {
        serializeOneToOneTroupeEvent(userId, "remove", this, f.waitor());
      }

      f.all().then(function() { postNext(); }).fail(function(err) { postNext(err); });
    });

    if(this.oneToOne) {
      troupeUser.deactivated = true;
    } else {
      troupeUser.remove();
    }

  } else {
    winston.warn("Troupe.removeUserById: User " + userId + " not in troupe " + this.id);
  }
};

TroupeSchema.methods.reactivateUserById = function(userId) {
  assert(userId);
  assert(this.oneToOne);

  winston.verbose("Troupe.reactivateUserById", { userId: userId, troupeId: this.id });

  // TODO: disable this methods for one-to-one troupes
  var troupeUser = _.find(this.users, function(troupeUser){ return troupeUser.userId == userId; });

  if(troupeUser) {
    // TODO: unfortunately the TroupeUser middleware remove isn't being called as we may have expected.....
    this.post('save', function(postNext) {
      serializeOneToOneTroupeEvent(userId, "create", this, postNext);
    });

    troupeUser.deactivated = undefined;
  } else {
    winston.warn("Troupe.reactivateUserById: User " + userId + " not in troupe " + this.id);
  }
};

var UserTroupeSettingsSchema = require('./persistence/user-troupe-settings-schema.js');
var UserSettingsSchema = require('./persistence/user-settings-schema.js');

//
// An invitation to a person to join a Troupe
//
var InviteSchema = new Schema({
  troupeId:           { type: ObjectId, "default": null  }, // If this is null, the invite is to connect as a person
  fromUserId:         { type: ObjectId, required: true }, // The user who initiated the invite

  userId:             { type: ObjectId, "default": null }, // The userId of the recipient, if they are already a troupe user

  displayName:        { type: String },   // If !userId, the name of the recipient
  email:              { type: String },   // If !userId, the email address of the recipient

  createdAt:          { type: Date, "default": Date.now },
  emailSentAt:        { type: Date },
  code:               { type: String },
  status:             { type: String, "enum": ['UNUSED', 'USED', 'INVALID'], "default": 'UNUSED'},
  _tv:                { type: 'MongooseNumber', 'default': 0 }
});
InviteSchema.schemaTypeName = 'InviteSchema';
InviteSchema.index({ userId: 1 });
InviteSchema.index({ email: 1 });
InviteSchema.path('userId').validate(function(v) {
    if(!v) {
      return !!this.email;
    }
}, 'Either {PATH} or email must be set');
InviteSchema.path('email').validate(function(v) {
    if(!v) {
      return !!this.userId;
    }
}, 'Either {PATH} or userId must be set');


var InviteUnconfirmedSchema = mongooseUtils.cloneSchema(InviteSchema);
InviteUnconfirmedSchema.schemaTypeName = 'InviteUnconfirmedSchema';
InviteUnconfirmedSchema.index({ userId: 1 });
InviteUnconfirmedSchema.index({ email: 1 });

var InviteUsedSchema = mongooseUtils.cloneSchema(InviteSchema);
InviteUsedSchema.schemaTypeName = 'InviteUsedSchema';
InviteUsedSchema.index({ userId: 1 });
InviteUsedSchema.index({ email: 1 });

//
// A request by a user to join a Troupe
// When a request is unconfirmed, the user who made the request is unconfirmed
//
var RequestSchema = new Schema({
  troupeId: ObjectId,
  userId: ObjectId,
  status: { type: String, "enum": ['PENDING', 'ACCEPTED', 'REJECTED'], "default": 'PENDING'},
  _tv: { type: 'MongooseNumber', 'default': 0 }
});
RequestSchema.schemaTypeName = 'RequestSchema';
RequestSchema.index({ userId: 1 });
RequestSchema.index({ troupeId: 1, status: 1 });

var RequestUnconfirmedSchema = mongooseUtils.cloneSchema(RequestSchema);
RequestUnconfirmedSchema.schemaTypeName = 'RequestUnconfirmedSchema';
RequestUnconfirmedSchema.index({ userId: 1 });
RequestUnconfirmedSchema.index({ troupeId: 1, status: 1 });

//
// A single chat
//
var ChatMessageSchema = new Schema({
  fromUserId: ObjectId,
  toTroupeId: ObjectId,  //TODO: rename to troupeId
  text: String,
  status: { type: Boolean, required: false },
  html: String,
  urls: Array,  // TODO: schema-ify this
  mentions: [{
    screenName: { type: String, required: true },
    userId: { type: ObjectId }
  }],
  issues: Array, // TODO: schema-ify this
  meta: Schema.Types.Mixed,
  sent: { type: Date, "default": Date.now },
  editedAt: { type: Date, "default": null },
  readBy: { type: [ObjectId] },
  _tv: { type: 'MongooseNumber', 'default': 0 },
  _md: Number,          // Meta parse version
});
ChatMessageSchema.index({ toTroupeId: 1, sent: -1 });
ChatMessageSchema.schemaTypeName = 'ChatMessageSchema';

//
// A single event
//
var EventSchema = new Schema({
  fromUserId: ObjectId,
  toTroupeId: ObjectId,  //TODO: rename to troupeId
  text: String,
  html: String,
  meta: Schema.Types.Mixed,
  payload: Schema.Types.Mixed,
  sent: { type: Date, "default": Date.now },
  editedAt: { type: Date, "default": null },
  _tv: { type: 'MongooseNumber', 'default': 0 },
  _md: Number,          // Meta parse version
});
EventSchema.index({ toTroupeId: 1, sent: -1 });
EventSchema.schemaTypeName = 'EventSchema';


//
// An email attachment
//
var EmailAttachmentSchema = new Schema({
  fileId: ObjectId,
  version: Number
});
EmailAttachmentSchema.schemaTypeName = 'EmailAttachmentSchema';

var EmailSchema = new Schema({
  from: { type: String },
  fromName: { type: String},
  fromUserId: ObjectId,
  troupeId: ObjectId,  // TODO: confirm if this can be removed
  subject: { type : String },
  date: {type: Date },
  preview: {type: String},
  mail: { type: String},
  messageIds: [ String ],
  attachments: [EmailAttachmentSchema]
});
EmailSchema.schemaTypeName = 'EmailSchema';

var ConversationSchema = new Schema({
  troupeId: ObjectId,
  updated: { type: Date, "default": Date.now },
  subject: { type: String },
  emails: [EmailSchema],
  _tv: { type: 'MongooseNumber', 'default': 0 }
});
ConversationSchema.index({ troupeId: 1 });
ConversationSchema.index({ 'emails.messageIds': 1 });
ConversationSchema.schemaTypeName = 'ConversationSchema';


ConversationSchema.methods.pushEmail = function(email) {
  this.post('save', function(postNext) {
    var url = "/rooms/" + this.troupeId + "/conversations/" + this.id;
    serializeEvent(url, "create", email, postNext);
  });

  return this.emails.push(email);
};

ConversationSchema.methods.removeEmail = function(email) {
  // TODO: unfortunately the TroupeUser middleware remove isn't being called as we may have expected.....
  this.post('save', function(postNext) {
    var url = "/rooms/" + this.troupeId + "/conversations/" + this.id;
    serializeEvent(url, "remove", email, postNext);
  });

  email.remove();
};

var FileVersionSchema = new Schema({
  creatorUserId: ObjectId,
  createdDate: { type: Date, "default": Date.now },
  deleted: { type: Boolean, "default": false },
  thumbnailStatus: { type: String, "enum": ['GENERATING', 'GENERATED', 'NO_THUMBNAIL'], "default": 'GENERATED'}, // In future, the default should be GENERATING

  /* In future, this might change, but for the moment, use a URI-type source */
  source: { type: String }
});
FileVersionSchema.schemaTypeName = 'FileVersionSchema';


var FileSchema = new Schema({
  troupeId: ObjectId,
  fileName: {type: String},
  mimeType: { type: String},
  previewMimeType: { type: String},
  versions: [FileVersionSchema],
  _tv: { type: 'MongooseNumber', 'default': 0 }
});
FileSchema.index({ troupeId: 1 });
FileSchema.schemaTypeName = 'FileSchema';


/*
 * OAuth Stuff
 */
var OAuthClientSchema = new Schema({
  name: String,
  tag: String,
  clientKey: String,
  clientSecret: String,
  registeredRedirectUri: String,
  canSkipAuthorization: Boolean,
  ownerUserId: ObjectId
});
OAuthClientSchema.index({ clientKey: 1 });
OAuthClientSchema.index({ ownerUserId: 1 });
OAuthClientSchema.schemaTypeName = 'OAuthClientSchema';

var OAuthCodeSchema = new Schema({
  code: String,
  clientId: ObjectId,
  redirectUri: String,
  userId: ObjectId
});
OAuthCodeSchema.index({ code: 1 });
OAuthCodeSchema.schemaTypeName = 'OAuthCodeSchema';

var OAuthAccessTokenSchema= new Schema({
  token: { type: String, index: true, unique: true },
  userId: ObjectId,
  clientId: ObjectId,
  expires: Date
});

OAuthAccessTokenSchema.index({ userId: 1, clientId: 1 }, { sparse: true }); // can't be unique due to mongo fail
OAuthAccessTokenSchema.schemaTypeName = 'OAuthAccessTokenSchema';


/*
 * Reverse Geocoder Stuff
 */
var GeoPopulatedPlaceSchema= new Schema({
  geonameid: String,
  name: String,
  coordinate: {
    lon: Number,
    lat: Number
  },
  region: {
    code: String,
    name: String
  },
  country: {
    code: String,
    name: String
  },
  population: Number,
  timezone: String
});
GeoPopulatedPlaceSchema.index({ coordinate: "2d" });
GeoPopulatedPlaceSchema.index({ geonameid: 1 });
GeoPopulatedPlaceSchema.schemaTypeName = 'GeoPopulatedPlaceSchema';

/*
 * Push Notifications
 */
 var PushNotificationDeviceSchema = new Schema({
  userId: ObjectId,
  deviceId: String,
  deviceName: String,
  /*
   * appleToken should be a raw Buffer, but mongoose throws a CastError when doing an update.
   * We instead store the hex string, which is what apn's pushNotification uses anyway.
   */
  appleToken: String,
  tokenHash: String,
  deviceType: { type: String, "enum": ['APPLE', 'APPLE-DEV', 'ANDROID', 'TEST', 'SMS']},
  mobileNumber: { type: String },
  enabled: { type: Boolean, default: true },
  appVersion: String,
  appBuild: String,
  timestamp: Date
});
PushNotificationDeviceSchema.index({ deviceId: 1 });
PushNotificationDeviceSchema.index({ userId: 1 });
PushNotificationDeviceSchema.index({ tokenHash: 1 });
PushNotificationDeviceSchema.index({ mobileNumber: 1 });

PushNotificationDeviceSchema.schemaTypeName = 'PushNotificationDeviceSchema';


/*
 * Push Notifications
 */
 var UriLookupSchema = new Schema({
  uri:      { type: String, unique: true },
  userId:   { type: ObjectId, unique: true, sparse: true },
  troupeId: { type: ObjectId, unique: true, sparse: true }
});
UriLookupSchema.schemaTypeName = 'UriLookupSchema';

/*
 * User contacts
 */
var ContactSchema = new Schema({
  userId: { type: ObjectId, ref: 'User' },        // Owner of the contact
  source: String,                                 // The source of the contact
  sourceId: String,                               // The ID for the contact used by the source
  name: String,                                   // Name of the contact
  emails: [String],                               // Email addresses for the contact
  contactUserId: { type: ObjectId, ref: 'User' }  // The user referenced by the contact, if they've signed up
});
ContactSchema.index({ userId: 1 });
ContactSchema.index({ emails: 1 });
ContactSchema.schemaTypeName = 'ContactSchema';


/*
 * User contacts
 */
var SuggestedContactSchema = new Schema({
  userId:        { type: ObjectId, ref: 'User' },           // Owner of the contact
  contactUserId: { type: ObjectId, ref: 'User' },           // The user referenced by the contact, if they've signed up
  name:          String,                                    // Name of the contact
  emails:        [String],                                  // Email addresses for the contact
  score:         { type: Number, default: 0 },              // Suggestion score
  username:      String,                                    // Username of the user
  knownEmails:   [String],                                  // Email addresses the user knows of the contact
  dateGenerated: { type: Date,   "default": Date.now }      // Generated at
});
SuggestedContactSchema.index({ userId: 1 });
SuggestedContactSchema.index({ emails: 1 });
SuggestedContactSchema.schemaTypeName = 'SuggestedContactSchema';

/*
 * Notifications opt-out
 */
var NotificationsPreferenceSchema = new Schema({
  userId:  { type: ObjectId, ref: 'User' },
  optIn:   Schema.Types.Mixed,
  optOut:  Schema.Types.Mixed
});
NotificationsPreferenceSchema.index({ userId: 1} , { unique: true });
NotificationsPreferenceSchema.schemaTypeName = 'NotificationsPreferenceSchema';


var SubscriptionSchema = require('./persistence/subscription-schema.js');

var User = mongoose.model('User', UserSchema);
var UserLocationHistory = mongoose.model('UserLocationHistory', UserLocationHistorySchema);
var UserTroupeLastAccess = mongoose.model('UserTroupeLastAccess', UserTroupeLastAccessSchema);
var UserTroupeFavourites = mongoose.model('UserTroupeFavourites', UserTroupeFavouritesSchema);

var Troupe = mongoose.model('Troupe', TroupeSchema);
var TroupeUser = mongoose.model('TroupeUser', TroupeUserSchema);
var TroupeBannedUser = mongoose.model('TroupeBannedUser', TroupeBannedUserSchema);
var UserTroupeSettings = mongoose.model('UserTroupeSettings', UserTroupeSettingsSchema);
var UserSettings = mongoose.model('UserSettings', UserSettingsSchema);
var Email = mongoose.model('Email', EmailSchema);
var EmailAttachment = mongoose.model('EmailAttachment', EmailAttachmentSchema);
var Conversation = mongoose.model('Conversation', ConversationSchema);
var Invite = mongoose.model('Invite', InviteSchema);
var InviteUnconfirmed = mongoose.model('InviteUnconfirmed', InviteUnconfirmedSchema);
var InviteUsed = mongoose.model('InviteUsed', InviteUsedSchema);

var Request = mongoose.model('Request', RequestSchema);
var RequestUnconfirmed = mongoose.model('RequestUnconfirmed', RequestUnconfirmedSchema);

var ChatMessage = mongoose.model('ChatMessage', ChatMessageSchema);
var Event = mongoose.model('Event', EventSchema);
var File = mongoose.model('File', FileSchema);
var FileVersion = mongoose.model('FileVersion', FileVersionSchema);

var OAuthClient = mongoose.model('OAuthClient', OAuthClientSchema);
var OAuthCode = mongoose.model('OAuthCode', OAuthCodeSchema);
var OAuthAccessToken = mongoose.model('OAuthAccessToken', OAuthAccessTokenSchema);

var GeoPopulatedPlace = mongoose.model('GeoPopulatedPlaces', GeoPopulatedPlaceSchema);

var PushNotificationDevice = mongoose.model('PushNotificationDevice', PushNotificationDeviceSchema);
var UriLookup = mongoose.model('UriLookup', UriLookupSchema);

var Contact = mongoose.model('Contact', ContactSchema);
var SuggestedContact = mongoose.model('SuggestedContact', SuggestedContactSchema);

var NotificationsPreference = mongoose.model('NotificationsPreference', NotificationsPreferenceSchema);
var Subscription = mongoose.model('Subscription', SubscriptionSchema);

module.exports = {
  schemas: {
    UserSchema: UserSchema,
    UserLocationHistorySchema: UserLocationHistorySchema,
    UserTroupeLastAccessSchema: UserTroupeLastAccessSchema,
    UserTroupeFavouritesSchema: UserTroupeFavouritesSchema,
    TroupeSchema: TroupeSchema,
    TroupeUserSchema: TroupeUserSchema,
    TroupeBannedUserSchema: TroupeBannedUserSchema,
    UserTroupeSettingsSchema: UserTroupeSettingsSchema,
    UserSettingsSchema: UserSettingsSchema,
    EmailSchema: EmailSchema,
    EmailAttachmentSchema: EmailAttachmentSchema,
    ConversationSchema: ConversationSchema,
    InviteSchema: InviteSchema,
    RequestSchema: RequestSchema,
    ChatMessageSchema: ChatMessageSchema,
    EventSchema: EventSchema,
    FileSchema: FileSchema,
    FileVersionSchema: FileVersionSchema,
    OAuthClientSchema: OAuthClientSchema,
    OAuthCodeSchema: OAuthCodeSchema,
    OAuthAccessTokenSchema: OAuthAccessTokenSchema,
    GeoPopulatedPlaceSchema: GeoPopulatedPlaceSchema,
    PushNotificationDeviceSchema: PushNotificationDeviceSchema,
    UriLookupSchema: UriLookupSchema,
    ContactSchema: ContactSchema,
    SuggestedContactSchema: SuggestedContactSchema,
    NotificationsPreferenceSchema: NotificationsPreferenceSchema,
    SubscriptionSchema: SubscriptionSchema
  },
  User: User,
  UserTroupeLastAccess: UserTroupeLastAccess,
  UserTroupeFavourites: UserTroupeFavourites,
  Troupe: Troupe,
  TroupeUser: TroupeUser,
  TroupeBannedUser: TroupeBannedUser,
  UserTroupeSettings: UserTroupeSettings,
  UserSettings: UserSettings,
	Email: Email,
  EmailAttachment: EmailAttachment,
  Conversation: Conversation,
	Invite: Invite,
  InviteUnconfirmed: InviteUnconfirmed,
  InviteUsed: InviteUsed,
  Request: Request,
  RequestUnconfirmed: RequestUnconfirmed,
	ChatMessage: ChatMessage,
  Event: Event,
  File: File,
  FileVersion: FileVersion,
  OAuthClient: OAuthClient,
  OAuthCode: OAuthCode,
  OAuthAccessToken: OAuthAccessToken,
  GeoPopulatedPlace: GeoPopulatedPlace,
  UserLocationHistory: UserLocationHistory,
  PushNotificationDevice: PushNotificationDevice,
  UriLookup: UriLookup,
  Contact: Contact,
  SuggestedContact: SuggestedContact,
  NotificationsPreference: NotificationsPreference,
  Subscription: Subscription
};

var events = require("./persistence-service-events");
events.install(module.exports);
