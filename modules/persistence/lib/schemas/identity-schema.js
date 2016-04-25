'use strict';

var mongoose       = require('gitter-web-mongoose-bluebird');
var Schema         = mongoose.Schema;
var ObjectId       = Schema.ObjectId;

var IdentitySchema = new Schema({
  userId: { type: ObjectId },
  provider: { type: String },
  providerKey: { type: String },
  username: { type: String },
  displayName: { type: String },
  email: { type: String },
  accessToken: { type: String },
  // example: google oauth2
  refreshToken: { type: String },
  // example: twitter oauth1
  accessTokenSecret: { type: String },
  avatar: { type: String }
});

IdentitySchema.schemaTypeName = 'IdentitySchema';

IdentitySchema.index({ userId: 1, provider: 1 }, { unique: true });
IdentitySchema.index({ provider: 1, providerKey: 1 }, { unique: true });
// not all of them have usernames or email addresses, so it will cause key
// errors if you set unique. It hought sparse might help, but with compound
// indexes it will still go ahead if at least one is set and provider is always
// set.
//IdentitySchema.index({ provider: 1, username: 1 }, { unique: true });
//IdentitySchema.index({ provider: 1, email: 1 }, { unique: true });

module.exports = {
  install: function(mongooseConnection) {
    var model = mongooseConnection.model('Identity', IdentitySchema);
    return {
      model: model,
      schema: IdentitySchema
    };
  }
};
