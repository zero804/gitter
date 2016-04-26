"use strict";

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema   = mongoose.Schema;
var ObjectId = Schema.ObjectId;

module.exports = {
  type: { type: String, enum: [
    'NONE',
    'GH_REPO',
    'GH_ORG',
    null
    // 'GROUP' permissions from group
  ], required: false },
  members: { type: String, enum: [
    'PUBLIC',          // Anyone
    'INVITE',          // Only invited users can join (private)
    'GH_REPO_PUSH',    // for GH_REPO, must have repo push or admin
    'GH_ORG_MEMBER',   // for GH_ORG, must be org member
  ]},
  admins: { type: String, enum: [
    'MANUAL',        // Only users in extraUserIds are admins
    'GH_REPO_PUSH',  // for GH_REPO, must have repo push or admin
    'GH_ORG_MEMBER', // for GH_ORG, must be org member
    // 'GROUP_ADMIN' // for GROUP, but be a group admin
  ]},
  public: { type: Boolean },
  linkPath: { type: String },
  externalId: { type: String },
  extraMembers: { type: [ObjectId] }, // TODO: record who added etc?
  extraAdmins: { type: [ObjectId] },  // TODO: record who added etc?
};
