'use strict';

var mongoose       = require('../../utils/mongoose-q');
var Schema         = mongoose.Schema;


var IdentitySchema = new Schema({
  provider: { type: String },
  providerKey: { type: String },
  username: { type: String },
  displayName: { type: String },
  accessToken: { type: String },
  refreshToken: { type: String },
  avatar: { type: String }
});

IdentitySchema.schemaTypeName = 'IdentitySchema';

IdentitySchema.index({ userId: 1, provider: 1 }, { unique: true });
IdentitySchema.index({ provider: 1, providerKey: 1 }, { unique: true });
IdentitySchema.index({ provider: 1, username: 1 }, { unique: true });

module.exports = {
  install: function(mongooseConnection) {
    var model = mongooseConnection.model('Identity', IdentitySchema);
    return {
      model: model,
      schema: IdentitySchema
    };
  }
};
