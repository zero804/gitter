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

var TroupeSchema = new Schema({
  name: { type: String },
  uri: { type: String },
  status: { type: String, enum: ['INACTIVE', 'ACTIVE'], default: 'INACTIVE'},
  users: [ObjectId]
});

var EmailSchema = new Schema({
  from: { type: String },
  fromName: { type: String},
  troupeId: ObjectId,
  subject: { type : String },
  date: {type: Date },
  mail: { type: String},
  delivered: { type: Boolean}
 });
  

var User = mongoose.model('User', UserSchema);
var Troupe = mongoose.model('Troupe', TroupeSchema);
var Email = mongoose.model('Email', EmailSchema);


module.exports = {
  User: User,
  Troupe: Troupe,
	Email: Email
};