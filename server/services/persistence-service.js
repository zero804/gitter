var mongoose = require("mongoose");

var Schema = mongoose.Schema, 
    ObjectId = Schema.ObjectId;

mongoose.connect('mongodb://localhost/troupe');

console.log("Connecting to mongodb");

var UserSchema = new Schema({
  name: { type: String }, 
  email: { type: String },
  confirmationCode: {type: String }
});

var TroupeSchema = new Schema({
  name: { type: String },
  uri: { type: String }
});

var User = mongoose.model('User', UserSchema);
var Troupe = mongoose.model('Troupe', TroupeSchema);

module.exports = {
    User: User,
    Troupe: Troupe
};