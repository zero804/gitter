"use strict";

var mongoose      = require('../../utils/mongoose-q');
var Schema        = mongoose.Schema;
var ObjectId      = Schema.ObjectId;

var UserTroupeLastAccessSchema = new Schema({
  userId: ObjectId,
  troupes: Schema.Types.Mixed
});
UserTroupeLastAccessSchema.index({ userId: 1 });
UserTroupeLastAccessSchema.schemaTypeName = 'UserTroupeLastAccessSchema';

module.exports = {
  install: function(mongooseConnection) {
    var model = mongooseConnection.model('UserTroupeLastAccess', UserTroupeLastAccessSchema);

    return {
      model: model,
      schema: UserTroupeLastAccessSchema
    };
  }
};
