"use strict";

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

module.exports = {
  install: function(mongooseConnection) {

    var TroupeInviteSchema = new Schema({
      troupeId: { type: ObjectId, required: true },
      type: { type: String, 'enum': ['EMAIL', 'GITHUB', 'TWITTER'], required: true },
      emailAddress: { type: String, required: true },
      externalId: { type: String, required: true },
      userId: { type: ObjectId, required: false },
      invitedByUserId: { type: ObjectId },
      secret: { type: String },
      state: { type: String, 'enum': ['PENDING', 'ACCEPTED', 'REJECTED'], required: true },
    }, { strict: 'throw' });

    TroupeInviteSchema.schemaTypeName = 'TroupeInviteSchema';

    // Do not allow duplicate invites for the same external id
    TroupeInviteSchema.index({ troupeId: 1, type: 1, externalId: 1 }, { unique: true });

    TroupeInviteSchema.index({ troupeId: 1 });
    TroupeInviteSchema.index({ type: 1, externalId: 1 });
    TroupeInviteSchema.index({ userId: 1 });
    TroupeInviteSchema.index({ secret: 1 }, { unique: true, sparse: true });

    var TroupeInvite = mongooseConnection.model('TroupeInvite', TroupeInviteSchema);

    return {
      model: TroupeInvite,
      schema: TroupeInviteSchema
    };
  }
};
