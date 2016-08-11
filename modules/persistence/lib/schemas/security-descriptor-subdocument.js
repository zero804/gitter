'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var SecurityDescriptorSchema = new Schema({
  type: { type: String, enum: [
    null,   // TODO: should none be null?
    'ONE_TO_ONE',
    'GH_REPO',
    'GH_ORG',
    'GH_USER',
    'GROUP'
  ], required: false },
  members: { type: String, enum: [
    null,              // For one-to-one
    'PUBLIC',          // Anyone
    'INVITE',          // Only invited users can join (private)
    'GH_REPO_ACCESS',  // for GH_REPO, must be able to see the repo
    'GH_REPO_PUSH',    // for GH_REPO, must have repo push or admin
    'GH_ORG_MEMBER',   // for GH_ORG, must be org member
  ]},
  admins: { type: String, enum: [
    null,             // For one-to-one rooms
    'MANUAL',         // Only users in extraUserIds are admins
    'GH_REPO_PUSH',   // for GH_REPO, must have repo push or admin
    'GH_ORG_MEMBER',  // for GH_ORG, must be org member
    'GH_USER_SAME',   // For GH_USER, user is same
    'GROUP_ADMIN'     // for GROUP, must be a group admin
  ]},
  public: { type: Boolean },
  linkPath: { type: String },
  externalId: { type: String },
  internalId: { type: ObjectId },
  extraMembers: { type: [ObjectId] }, // TODO: record who added etc?
  extraAdmins: { type: [ObjectId] },  // TODO: record who added etc?
}, { strict: 'throw' });


function installIndexes(Schema, Model) {

  // Create a partial index for troupe security descriptors
  Model.collection.createIndex({
      'sd.type': 1,
      'sd.linkPath': 1
    } , {
      background: true,
      partialFilterExpression: {
        'sd.linkPath': { $exists: true }
      }
    },
    function(err) {
      if (err) throw err;
    });

  Model.collection.createIndex({
      'sd.type': 1,
      'sd.externalId': 1
    } , {
      background: true,
      partialFilterExpression: {
        externalId: { $exists: true }
      }
    },
    function(err) {
      if (err) throw err;
    });

  Model.collection.createIndex({
      'sd.type': 1,
      'sd.internalId': 1
    } , {
      background: true,
      partialFilterExpression: {
        internalId: { $exists: true }
      }
    },
    function(err) {
      if (err) throw err;
    });

}

module.exports = {
  Schema: SecurityDescriptorSchema,
  installIndexes: installIndexes
};
