/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var mongoose      = require('../../utils/mongoose-q');
var Schema        = mongoose.Schema;
var ObjectId      = Schema.ObjectId;

//
// Settings for a user for a troupe
//
var UserTroupeSettingsSchema = new Schema({
  userId:   ObjectId,
  troupeId: ObjectId,
  settings: Schema.Types.Mixed
});
UserTroupeSettingsSchema.index({ userId: 1, troupeId: 1 }, { unique: true });
UserTroupeSettingsSchema.schemaTypeName = 'UserTroupeSettingsSchema';

module.exports = {
  install: function(mongooseConnection) {
    var model = mongooseConnection.model('UserTroupeSettings', UserTroupeSettingsSchema);

    return {
      model: model,
      schema: UserTroupeSettingsSchema
    };
  }
};
