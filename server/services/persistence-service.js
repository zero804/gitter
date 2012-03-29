var mongoose = require("mongoose");

var Schema = mongoose.Schema, 
    ObjectId = Schema.ObjectId;

mongoose.connect('mongodb://localhost/troupe');

var UserSchema = new Schema({
  displayName: { type: String }, 
  email: { type: String },
  confirmationCode: {type: String },
  status: { type: String, enum: ['UNCONFIRMED', 'ACTIVE'], default: 'UNCONFIRMED'},
  passwordHash: { type: String }
});

UserSchema.methods.narrow = function() {
  return {
    id: this.id,
    displayName: this.displayName
  };
};

var TroupeSchema = new Schema({
  name: { type: String },
  uri: { type: String },
  status: { type: String, enum: ['INACTIVE', 'ACTIVE'], default: 'INACTIVE'},
  users: [ObjectId]
});

var InviteSchema = new Schema({
  troupeId: ObjectId,
  displayName: { type: String },
  email: { type: String },
  code: { type: String },
  status: { type: String, enum: ['UNUSED', 'USED'], default: 'UNUSED'}
});

var ChatMessageSchema = new Schema({
  fromUserId: ObjectId,
  toTroupeId: ObjectId,
  text: String,
  sent: { type: Date, default: Date.now }
});

var EmailSchema = new Schema({
  from: { type: String },
  fromName: { type: String},
  troupeId: ObjectId,
  subject: { type : String },
  date: {type: Date },
  preview: {type: String},
  mail: { type: String},
  delivered: { type: Boolean}
});

EmailSchema.methods.narrow = function () {
  return {
    _id: this._id,
    from: this.from,
    fromName: this.fromName,
    subject: this.subject,
    date: this.date,
    preview: this.preview
  };

};

var FileSchema = new Schema({
  troupeId: ObjectId,
  creatorUserId: ObjectId,
  fileName: {type: String},
  mimeType: { type: String}
});

FileSchema.methods.narrow = function () {
  return {
    _id: this._id,
    fileName: this.fileName,
    mimeType: this.mimeType,
    url: '/troupes/' + encodeURIComponent(this.troupeId) + '/downloads/' + encodeURIComponent(this.fileName)
  };

};


var User = mongoose.model('User', UserSchema);
var Troupe = mongoose.model('Troupe', TroupeSchema);
var Email = mongoose.model('Email', EmailSchema);
var Invite = mongoose.model('Invite', InviteSchema);
var ChatMessage = mongoose.model('ChatMessage', ChatMessageSchema);
var File = mongoose.model('File', FileSchema);

module.exports = {
  User: User,
  Troupe: Troupe,
	Email: Email,
	Invite: Invite,
	ChatMessage: ChatMessage,
  File: File
};