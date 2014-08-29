"use strict";

var mongoose      = require('../../utils/mongoose-q');
var Schema        = mongoose.Schema;
var ObjectId      = Schema.ObjectId;

var OAuthCodeSchema = new Schema({
  code: String,
  clientId: ObjectId,
  redirectUri: String,
  userId: ObjectId
});
OAuthCodeSchema.index({ code: 1 });
OAuthCodeSchema.schemaTypeName = 'OAuthCodeSchema';

module.exports = {
  install: function(mongooseConnection) {
    var model = mongooseConnection.model('OAuthCode', OAuthCodeSchema);

    return {
      model: model,
      schema: OAuthCodeSchema
    };
  }
};
