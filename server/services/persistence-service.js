/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var mongoose = require("mongoose");
var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;
var appEvents = require("../app-events");

mongoose.connect('mongodb://localhost/troupe');

/* TODO(AN): remove narrow. Deprecated */
Array.prototype.narrow = function() {
  return this.map(function(value) { return value.narrow(); });
};

var UserSchema = new Schema({
  displayName: { type: String }, 
  email: { type: String },
  confirmationCode: {type: String },
  status: { type: String, "enum": ['UNCONFIRMED', 'PROFILE_NOT_COMPLETED', 'ACTIVE'], "default": 'UNCONFIRMED'},
  passwordHash: { type: String },
  avatarUrlSmall: String,
  avatarUrlMedium: String
});

/* TODO(AN): remove narrow. Deprecated */
UserSchema.methods.narrow = function() {
  return {
    id: this.id,
    displayName: this.displayName,
    avatarUrl: this.getAvatarUrl()
  };
};

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

/* TODO(AN): remove narrow. Deprecated */
TroupeSchema.methods.narrow = function () {
  return {
    id: this._id,
    name: this.name,
    uri: this.uri
  };
};

var InviteSchema = new Schema({
  troupeId: ObjectId,
  displayName: { type: String },
  email: { type: String },
  code: { type: String },
  status: { type: String, "enum": ['UNUSED', 'USED'], "default": 'UNUSED'}
});

/* TODO(AN): remove narrow. Deprecated */
InviteSchema.methods.narrow = function () {
  return {
    id: this._id,
    displayName: this.displayName,
    email: this.email
  };
};

var RequestSchema = new Schema({
  troupeId: ObjectId,
  userId: ObjectId
});

var ChatMessageSchema = new Schema({
  fromUserId: ObjectId,
  toTroupeId: ObjectId,  //TODO: rename to troupeId
  text: String,
  sent: { type: Date, "default": Date.now }
});

/* TODO(AN): remove narrow. Deprecated */
ChatMessageSchema.methods.narrow = function (user, troupe) {
  return {
    id: this._id,
    text: this.text,
    sent: this.sent,
    fromUser: user ? user.narrow() : null,
    toTroupe: troupe ? troupe.narrow() : null
  };
};

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

/* TODO(AN): remove narrow. Deprecated */
EmailSchema.methods.narrow = function () {
  return {
    id: this.id,
    from: this.from,
    fromName: this.fromName,
    subject: this.subject,
    date: this.date,
    preview: this.preview
  };
};

var ConversationSchema = new Schema({
  troupeId: ObjectId,
  updated: { type: Date, "default": Date.now },
  subject: { type: String },
  emails: [EmailSchema]
});

/* TODO(AN): remove narrow. Deprecated */
ConversationSchema.methods.narrow = function () {
  return {
    id: this.id,
    subject: this.subject
  };
};


var FileVersionSchema = new Schema({
  creatorUserId: ObjectId,
  createdDate: { type: Date, "default": Date.now },
  deleted: { type: Boolean, "default": false },

  /* In future, this might change, but for the moment, use a URI-type source */
  source: { type: String }
});

/* TODO(AN): remove narrow. Deprecated */
function narrowFileVersion(fileVersion) {
  return {
    creatorUserId: fileVersion.creatorUserId,
    createdDate: fileVersion.createdDate,
    source: fileVersion.source,
    deleted: fileVersion.deleted
  };
}

/* TODO(AN): remove narrow. Deprecated */
FileVersionSchema.methods.narrow = function () {
  return narrowFileVersion(this);
};

var FileSchema = new Schema({
  troupeId: ObjectId,
  fileName: {type: String},
  mimeType: { type: String},
  previewMimeType: { type: String},
  versions: [FileVersionSchema]
});

/* TODO(AN): remove narrow. Deprecated */
function narrowFile(file) {
  return {
      id: file._id,
      fileName: file.fileName,
      mimeType: file.mimeType,
      versions: file.versions.map(narrowFileVersion),
      url: '/troupes/' + encodeURIComponent(file.troupeId) + '/downloads/' + encodeURIComponent(file.fileName),
      previewMimeType: file.previewMimeType,
      embeddedViewType: file.embeddedViewType,
      embeddedUrl: '/troupes/' + encodeURIComponent(file.troupeId) + '/embedded/' + encodeURIComponent(file.fileName)
    };
}

/* TODO(AN): remove narrow. Deprecated */
FileSchema.methods.narrow = function () {
  return narrowFile(this);
};

var NotificationSchema = new Schema({
  troupeId: ObjectId,
  userId: ObjectId,
  notificationName: {type: String},
  data: { type: {}},
  createdDate: { type: Date, "default": Date.now }
});


var User = mongoose.model('User', UserSchema);
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

function attachNotificationListenersToSchema(schema, name, extractor) {
  if(!extractor) {
    extractor = function(model) {
      return {
        id: model.id,
        troupeId: model.troupeId
      };
    };
  }

  schema.post('save', function(model, numAffected) {
    var e = extractor(model);
    console.log("Save " + name + ". troupeId=", model.troupeId);
    appEvents.dataChange(name, 'update', e.id, e.troupeId, model);
  });

  schema.post('remove', function(model, numAffected) {
    var e = extractor(model);
    console.log("Remove " + name + ". troupeId=", model.troupeId);
    appEvents.dataChange(name, 'remove', e.id, e.troupeId);
  });
}

attachNotificationListenersToSchema(ConversationSchema, 'conversation');
attachNotificationListenersToSchema(FileSchema, 'file');
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
  narrowFile: narrowFile,
  narrowFileVersion: narrowFileVersion
};