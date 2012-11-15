/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var mongoose = require("mongoose");
var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;
var appEvents = require("../app-events");

mongoose.connect('mongodb://localhost/troupe');

var UserSchema = new Schema({
  displayName: { type: String },
  email: { type: String },
  confirmationCode: {type: String },
  status: { type: String, "enum": ['UNCONFIRMED', 'PROFILE_NOT_COMPLETED', 'ACTIVE'], "default": 'UNCONFIRMED'},
  passwordHash: { type: String },
  passwordResetCode: String,
  avatarUrlSmall: String,
  avatarUrlMedium: String,
  lastTroupe: ObjectId,
  location: {
    timestamp: Date,
    coordinate: {
      lon: Number,
      lat: Number
    },
    speed: Number,
    altitude: Number,
    named: {
      place: String,
      region: String,
      countryCode: String
    }
  },
  userToken: String // TODO: move to OAuth
});
UserSchema.index({ email: 1 });

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

UserSchema.methods.getAvatarUrl = function() {
  if(this.avatarUrlSmall) {
    return this.avatarUrlSmall;
  }

  return "/avatar/" + this.id;
};

var TroupeSchema = new Schema({
  name: { type: String },
  uri: { type: String },
  status: { type: String, "enum": ['INACTIVE', 'ACTIVE'], "default": 'INACTIVE'},
  users: [ObjectId]
});
TroupeSchema.index({ uri: 1 });

var InviteSchema = new Schema({
  troupeId: ObjectId,
  displayName: { type: String },
  email: { type: String },
  code: { type: String },
  status: { type: String, "enum": ['UNUSED', 'USED'], "default": 'UNUSED'}
});

var RequestSchema = new Schema({
  troupeId: ObjectId,
  userId: ObjectId,
  status: { type: String, "enum": ['PENDING', 'ACCEPTED', 'REJECTED'], "default": 'PENDING'}
});

var ChatMessageSchema = new Schema({
  fromUserId: ObjectId,
  toTroupeId: ObjectId,  //TODO: rename to troupeId
  text: String,
  sent: { type: Date, "default": Date.now }
});
ChatMessageSchema.index({ toTroupeId: 1, sent: -1 });

var EmailAttachmentSchema = new Schema({
  fileId: ObjectId,
  version: Number
});

var EmailSchema = new Schema({
  from: { type: String },
  fromName: { type: String},
  fromUserId: ObjectId,
  troupeId: ObjectId,
  subject: { type : String },
  date: {type: Date },
  preview: {type: String},
  mail: { type: String},
  messageId: { type: String},
  attachments: [EmailAttachmentSchema]
});

/*
EmailSchema.pre('save', function (next) {
  next();
});
*/

var ConversationSchema = new Schema({
  troupeId: ObjectId,
  updated: { type: Date, "default": Date.now },
  subject: { type: String },
  emails: [EmailSchema]
});
ConversationSchema.index({ troupeId: 1 });

var FileVersionSchema = new Schema({
  creatorUserId: ObjectId,
  createdDate: { type: Date, "default": Date.now },
  deleted: { type: Boolean, "default": false },
  thumbnailStatus: { type: String, "enum": ['GENERATING', 'GENERATED', 'NO_THUMBNAIL'], "default": 'GENERATED'}, // In future, the default should be GENERATING

  /* In future, this might change, but for the moment, use a URI-type source */
  source: { type: String }
});


var FileSchema = new Schema({
  troupeId: ObjectId,
  fileName: {type: String},
  mimeType: { type: String},
  previewMimeType: { type: String},
  versions: [FileVersionSchema]
});
FileSchema.index({ troupeId: 1 });

var NotificationSchema = new Schema({
  troupeId: ObjectId,
  userId: ObjectId,
  notificationName: {type: String},
  data: { type: {}},
  createdDate: { type: Date, "default": Date.now }
});
NotificationSchema.index({ troupeId: 1 });
NotificationSchema.index({ userId: 1 });

/*
 * OAuth Stuff
 */
var OAuthClientSchema = new Schema({
  name: String,
  clientKey: String,
  clientSecret: String,
  registeredRedirectUri: String,
  canSkipAuthorization: Boolean
});
OAuthClientSchema.index({ clientKey: 1 });

var OAuthCodeSchema = new Schema({
  code: String,
  clientId: ObjectId,
  redirectUri: String,
  userId: ObjectId
});
OAuthCodeSchema.index({ code: 1 });

var OAuthAccessTokenSchema= new Schema({
  token: String,
  userId: ObjectId,
  clientId: ObjectId
});
OAuthAccessTokenSchema.index({ token: 1 });


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

var User = mongoose.model('User', UserSchema);
var UserLocationHistory = mongoose.model('UserLocationHistory', UserLocationHistorySchema);

var Troupe = mongoose.model('Troupe', TroupeSchema);
var Email = mongoose.model('Email', EmailSchema);
var EmailAttachment = mongoose.model('EmailAttachment', EmailAttachmentSchema);
var Conversation = mongoose.model('Conversation', ConversationSchema);
var Invite = mongoose.model('Invite', InviteSchema);
var Request = mongoose.model('Request', RequestSchema);
var ChatMessage = mongoose.model('ChatMessage', ChatMessageSchema);
var File = mongoose.model('File', FileSchema);
var FileVersion = mongoose.model('FileVersion', FileVersionSchema);
var Notification = mongoose.model('Notification', NotificationSchema);

var OAuthClient = mongoose.model('OAuthClient', OAuthClientSchema);
var OAuthCode = mongoose.model('OAuthCode', OAuthCodeSchema);
var OAuthAccessToken = mongoose.model('OAuthAccessToken', OAuthAccessTokenSchema);

var GeoPopulatedPlace = mongoose.model('GeoPopulatedPlaces', GeoPopulatedPlaceSchema);

/** */
function attachNotificationListenersToSchema(schema, name, extractor) {
  if(!extractor) {
    extractor = function(model) {
      return {
        id: model.id,
        troupeId: model.troupeId
      };
    };
  }

  schema.pre('save', function (next) {
    var isNewInstance = this.isNew;

    this.post('save', function(postNext) {
      var e = extractor(this);

      appEvents.dataChange(name, isNewInstance ? 'create' : 'update', e.id, e.troupeId, this);
      postNext();
    });

    next();
  });

  schema.post('remove', function(model, numAffected) {
    var e = extractor(model);
    console.log("Remove " + name + ". troupeId=", model.troupeId);
    appEvents.dataChange(name, 'remove', e.id, e.troupeId);
  });
}

attachNotificationListenersToSchema(ConversationSchema, 'conversation');
attachNotificationListenersToSchema(FileSchema, 'file');
attachNotificationListenersToSchema(InviteSchema, 'invite');
attachNotificationListenersToSchema(RequestSchema, 'request');
//attachNotificationListenersToSchema(NotificationSchema, 'notification');
attachNotificationListenersToSchema(ChatMessageSchema, 'chat', function(model) {
  return {
    id: model.id,
    troupeId: model.toTroupeId
  };
});

module.exports = {
  User: User,
  Troupe: Troupe,
	Email: Email,
  EmailAttachment: EmailAttachment,
  Conversation: Conversation,
	Invite: Invite,
  Request: Request,
	ChatMessage: ChatMessage,
  File: File,
  FileVersion: FileVersion,
  Notification: Notification,
  OAuthClient: OAuthClient,
  OAuthCode: OAuthCode,
  OAuthAccessToken: OAuthAccessToken,
  GeoPopulatedPlace: GeoPopulatedPlace,
  UserLocationHistory: UserLocationHistory
};