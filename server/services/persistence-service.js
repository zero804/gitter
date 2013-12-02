/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var mongoose      = require('../utils/mongoose-q');
var Schema        = mongoose.Schema;
var ObjectId      = Schema.ObjectId;
var mongooseUtils = require('../utils/mongoose-utils');
var appEvents     = require("../app-events");
var _             = require("underscore");
var winston       = require("winston");
var nconf         = require("../utils/config");
var shutdown      = require('../utils/shutdown');
var Fiber         = require("../utils/fiber");
var assert        = require("assert");


// Install inc and dec number fields in mongoose
require('mongoose-number')(mongoose);

var connection = mongoose.connection;

//mongoose.mongo = require('mongodb');
mongoose.set('debug', nconf.get("mongo:logQueries"));

mongoose.connect(nconf.get("mongo:url"), {
  server: {
    readPreference: "primaryPreferred",
    socketOptions: { keepAlive: 1, connectTimeoutMS: 3000 },
    auto_reconnect: true,
    autoReconnect: true
  },
  db: {
    readPreference: "primaryPreferred"
  },
  replset: {
    readPreference: "primaryPreferred",
    socketOptions: { keepAlive: 1, connectTimeoutMS: 2000 },
    auto_reconnect: true,
    autoReconnect: true
  }
});

shutdown.addHandler('mongo', 1, function(callback) {
  mongoose.disconnect(callback);
});

if(nconf.get("mongo:profileSlowQueries")) {
  mongoose.connection.on('open', function() {
    var MAX = 50;
    connection.setProfiling(1, MAX, function() {});
  });
}

connection.on('error', function(err) {
  winston.info("MongoDB connection error", { exception: err });
  console.error(err);
  if(err.stack) console.log(err.stack);
});

// --------------------------------------------------------------------
// Utility serialization stuff
// --------------------------------------------------------------------

// This needs to be late-bound to prevent circular dependencies
// TODO: review architecture to remove possible circular dependency
var serializeModel = null;
function serializeModelLateBound(model, callback) {
  if(serializeModel === null) {
    serializeModel = require("../serializers/rest-serializer").serializeModel;
  }
  serializeModel(model, callback);
}

function serializeEvent(url, operation, model, callback) {
  winston.verbose("Serializing " + operation + " to " + url);

  serializeModelLateBound(model, function(err, serializedModel) {
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
  // email: { type: String },                     // The primary email address
  emails: [String],                            // Secondary email addresses
  // unconfirmedEmails: [UnconfirmedEmailSchema], // Unconfirmed email addresses
  username: { type: String, required: true },
  // newEmail: String,
  confirmationCode: {type: String },
  // status: { type: String, "enum": ['UNCONFIRMED', 'PROFILE_NOT_COMPLETED', 'ACTIVE'], "default": 'UNCONFIRMED'},
  // passwordHash: { type: String },
  // passwordResetCode: String,
  // avatarVersion: { type: Number, "default": 0 },
  gravatarImageUrl: { type: String },
  lastTroupe: ObjectId,
  // location: {
  //   timestamp: Date,
  //   coordinate: {
  //     lon: Number,
  //     lat: Number
  //   },
  //   speed: Number,
  //   altitude: Number,
  //   named: {
  //     place: String,
  //     region: String,
  //     countryCode: String
  //   }
  // },
  googleRefreshToken: String,
  githubToken: { type: String },
  githubId: {type: Number },
  permissions: {
    createRoom: { type: Boolean, 'default': false }
  },
  // usernameSuggestion: { type: String },
  _tv: { type: 'MongooseNumber', 'default': 0 }
});
// UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ githubId: 1 }, { unique: true, sparse: true });
UserSchema.index({ username: 1 }, { unique: true /*, sparse: true */});
// UserSchema.index({ "emails.email" : 1 }, { unique: true, sparse: true });
UserSchema.schemaTypeName = 'UserSchema';

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
  userId: { type: ObjectId }
  // In future: role
});
TroupeUserSchema.schemaTypeName = 'TroupeUserSchema';

//
// A Troupe
//
var TroupeSchema = new Schema({
  name: { type: String },
  uri: { type: String },
  lcUri: { type: String, 'default': function() { return this.uri ? this.uri.toLowerCase() : null; }  },
  githubType: { type: String, 'enum': ['REPO', /*'USER',*/ 'ORG', 'ONETOONE'], required: true },
  status: { type: String, "enum": ['ACTIVE', 'DELETED'], "default": 'ACTIVE'},
  oneToOne: { type: Boolean, "default": false },
  users: [TroupeUserSchema],
  dateDeleted: { type: Date },
  _tv: { type: 'MongooseNumber', 'default': 0 }
});

// Ideally we should never search against URI, only lcURI
TroupeSchema.index({ uri: 1 }, { unique: true, sparse: true });
TroupeSchema.index({ lcUri: 1 }, { unique: true, sparse: true });
TroupeSchema.index({ "users.userId": 1 });
TroupeSchema.pre('save', function (next) {
  this.lcUri =  this.uri ? this.uri.toLowerCase() : null;
  next();
});

TroupeSchema.methods.getUserIds = function() {
  return this.users.map(function(troupeUser) { return troupeUser.userId; });
};

TroupeSchema.methods.containsUserId = function(userId) {
  var user = _.find(this.users, function(troupeUser) {
    return "" + troupeUser.userId == "" + userId;
  });

  return !!user;
};

TroupeSchema.methods.getOtherOneToOneUserId = function(knownUserId) {
  assert(this.oneToOne, 'getOtherOneToOneUserId should only be called on oneToOne troupes');
  assert(knownUserId, 'knownUserId required');

  var troupeUser = _.find(this.users, function(troupeUser) {
    return "" + troupeUser.userId != "" + knownUserId;
  });

  return troupeUser && troupeUser.userId;
};

TroupeSchema.methods.addUserById = function(userId) {
  var exists = this.users.some(function(user) { return user.userId == userId; });
  if(exists) {
    throw new Error("User already exists in this troupe.");
  }

  // TODO: disable this methods for one-to-one troupes
  var troupeUser = new TroupeUser({ userId: userId });
  this.post('save', function(postNext) {
    var f = new Fiber();

    var url = "/troupes/" + this.id + "/users";
    serializeEvent(url, "create", troupeUser, postNext);

    var userUrl = "/user/" + userId + "/troupes";
    serializeEvent(userUrl, "create", this, f.waitor());

    f.all().then(function() { postNext(); }).fail(function(err) { postNext(err); });
  });

  return this.users.push(troupeUser);
};

TroupeSchema.methods.removeUserById = function(userId) {
  assert(userId);
  // TODO: disable this methods for one-to-one troupes
  var troupeUser = _.find(this.users, function(troupeUser){ return troupeUser.userId == userId; });
  if(troupeUser) {
    // TODO: unfortunately the TroupeUser middleware remove isn't being called as we may have expected.....
    this.post('save', function(postNext) {
      var f = new Fiber();

      var url = "/troupes/" + this.id + "/users";
      serializeEvent(url, "remove", troupeUser, f.waitor());

      var userUrl = "/user/" + userId + "/troupes";
      serializeEvent(userUrl, "remove", this, f.waitor());

      // TODO: move this in a remove listener somewhere else in the codebase
      appEvents.userRemovedFromTroupe({ troupeId: this.id, userId: troupeUser.userId });

      f.all().then(function() { postNext(); }).fail(function(err) { postNext(err); });
    });

    troupeUser.remove();
  } else {
    winston.warn("Troupe.removeUserById: User " + userId + " not in troupe " + this.id);
  }
};

var TroupeRemovedUserSchema = new Schema({
  userId: { type: ObjectId },
  troupeId: { type: ObjectId },
  dateDeleted: { type: Date, "default": Date.now }
});
TroupeRemovedUserSchema.index({ userId: 1 });
TroupeRemovedUserSchema.schemaTypeName = 'TroupeRemovedUserSchema';

var UserTroupeSettingsSchema = require('./persistence/user-troupe-settings-schema.js');

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
  urls: Array,
  mentions: Array,
  issues: Array,
  meta: Schema.Types.Mixed,
  sent: { type: Date, "default": Date.now },
  editedAt: { type: Date, "default": null },
  readBy: { type: [ObjectId] },
  skipAlerts: {type: Boolean, "default": false},
  _tv: { type: 'MongooseNumber', 'default': 0 },
  _md: Number,          // Meta parse version
});
ChatMessageSchema.index({ toTroupeId: 1, sent: -1 });
ChatMessageSchema.schemaTypeName = 'ChatMessageSchema';

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
    var url = "/troupes/" + this.troupeId + "/conversations/" + this.id;
    serializeEvent(url, "create", email, postNext);
  });

  return this.emails.push(email);
};

ConversationSchema.methods.removeEmail = function(email) {
  // TODO: unfortunately the TroupeUser middleware remove isn't being called as we may have expected.....
  this.post('save', function(postNext) {
    var url = "/troupes/" + this.troupeId + "/conversations/" + this.id;
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
  canSkipAuthorization: Boolean
});
OAuthClientSchema.index({ clientKey: 1 });
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
  token: String,
  userId: ObjectId,
  clientId: ObjectId
});
OAuthAccessTokenSchema.index({ token: 1 });
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
  appleToken: Buffer,
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



var User = mongoose.model('User', UserSchema);
var UserLocationHistory = mongoose.model('UserLocationHistory', UserLocationHistorySchema);
var UserTroupeLastAccess = mongoose.model('UserTroupeLastAccess', UserTroupeLastAccessSchema);
var UserTroupeFavourites = mongoose.model('UserTroupeFavourites', UserTroupeFavouritesSchema);

var Troupe = mongoose.model('Troupe', TroupeSchema);
var TroupeUser = mongoose.model('TroupeUser', TroupeUserSchema);
var TroupeRemovedUser = mongoose.model('TroupeRemovedUser', TroupeRemovedUserSchema);
var UserTroupeSettings = mongoose.model('UserTroupeSettings', UserTroupeSettingsSchema);
var Email = mongoose.model('Email', EmailSchema);
var EmailAttachment = mongoose.model('EmailAttachment', EmailAttachmentSchema);
var Conversation = mongoose.model('Conversation', ConversationSchema);
var Invite = mongoose.model('Invite', InviteSchema);
var InviteUnconfirmed = mongoose.model('InviteUnconfirmed', InviteUnconfirmedSchema);
var InviteUsed = mongoose.model('InviteUsed', InviteUsedSchema);

var Request = mongoose.model('Request', RequestSchema);
var RequestUnconfirmed = mongoose.model('RequestUnconfirmed', RequestUnconfirmedSchema);

var ChatMessage = mongoose.model('ChatMessage', ChatMessageSchema);
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


//
// 8-May-2013: Delete this after it's been rolled into production!
//
Troupe.update({ status: 'INACTIVE' }, { status: 'ACTIVE' }, { multi: true }, function (err, numberAffected) {
  if (err) return winston.error(err);
  if(numberAffected > 0) {
    winston.warn('Updated ' + numberAffected + ' INACTIVE troupes to status ACTIVE');
  }
});


module.exports = {
  schemas: {
    UserSchema: UserSchema,
    UserLocationHistorySchema: UserLocationHistorySchema,
    UserTroupeLastAccessSchema: UserTroupeLastAccessSchema,
    UserTroupeFavouritesSchema: UserTroupeFavouritesSchema,
    TroupeSchema: TroupeSchema,
    TroupeUserSchema: TroupeUserSchema,
    TroupeRemovedUserSchema: TroupeRemovedUserSchema,
    UserTroupeSettingsSchema: UserTroupeSettingsSchema,
    EmailSchema: EmailSchema,
    EmailAttachmentSchema: EmailAttachmentSchema,
    ConversationSchema: ConversationSchema,
    InviteSchema: InviteSchema,
    RequestSchema: RequestSchema,
    ChatMessageSchema: ChatMessageSchema,
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
    NotificationsPreferenceSchema: NotificationsPreferenceSchema
  },
  User: User,
  UserTroupeLastAccess: UserTroupeLastAccess,
  UserTroupeFavourites: UserTroupeFavourites,
  Troupe: Troupe,
  TroupeUser: TroupeUser,
  TroupeRemovedUser: TroupeRemovedUser,
  UserTroupeSettings: UserTroupeSettings,
	Email: Email,
  EmailAttachment: EmailAttachment,
  Conversation: Conversation,
	Invite: Invite,
  InviteUnconfirmed: InviteUnconfirmed,
  InviteUsed: InviteUsed,
  Request: Request,
  RequestUnconfirmed: RequestUnconfirmed,
	ChatMessage: ChatMessage,
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
  NotificationsPreference: NotificationsPreference
};

process.nextTick(function() {
  var events = require("./persistence-service-events");
  events.install(module.exports);
});
