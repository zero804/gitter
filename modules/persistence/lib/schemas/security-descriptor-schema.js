'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

module.exports = {
  install: function(mongooseConnection) {

    //
    // A Security Policy
    //
    var SecurityDescriptorSchema = new Schema({
      troupeId: { type: ObjectId },
      groupId: { type: ObjectId },
      type: { type: String, enum: [
        null,   // TODO: should none be null?
        'ONE_TO_ONE',
        'GH_REPO',
        'GH_ORG',
        'GH_USER'
        // 'GROUP' permissions from group
      ], required: false },
      members: { type: String, enum: [
        'PUBLIC',          // Anyone
        'INVITE',          // Only invited users can join (private)
        'GH_REPO_ACCESS',  // for GH_REPO, must be able to see the repo
        'GH_REPO_PUSH',    // for GH_REPO, must have repo push or admin
        'GH_ORG_MEMBER',   // for GH_ORG, must be org member
      ]},
      admins: { type: String, enum: [
        'MANUAL',         // Only users in extraUserIds are admins
        'GH_REPO_PUSH',   // for GH_REPO, must have repo push or admin
        'GH_ORG_MEMBER',  // for GH_ORG, must be org member
        'GH_USER_SAME'    // For GH_USER, user is same
        // 'GROUP_ADMIN'  // for GROUP, but be a group admin
      ]},
      public: { type: Boolean },
      linkPath: { type: String },
      externalId: { type: String },
      extraMembers: { type: [ObjectId] }, // TODO: record who added etc?
      extraAdmins: { type: [ObjectId] },  // TODO: record who added etc?
    }, { strict: 'throw' });

    SecurityDescriptorSchema.schemaTypeName = 'SecurityDescriptorSchema';

    // TODO: implement this as a mongodb validator
    // validator: {
    // $or: [
    //   {
    //     $and: [
    //       { troupeId: { $exists: true } },
    //       { groupId: { $exists: false } },
    //     ]
    //   }, {
    //     $and: [
    //       { troupeId: { $exists: false } },
    //       { groupId: { $exists: true } },
    //     ]
    //   }
    // ]}
    SecurityDescriptorSchema.pre('save', function (next) {
      var hasTroupeOrGroup = !!this.troupeId && !this.groupId ||
                            !this.troupeId && !!this.groupId;

      if (!hasTroupeOrGroup) {
        var err = new Error('Security descriptor needs either a troupe or a group');
        return next(err);
      }

      return next();
    });

    var SecurityDescriptor = mongooseConnection.model('SecurityDescriptor', SecurityDescriptorSchema);

    // Create a partial index for troupe security descriptors
    SecurityDescriptor.collection.createIndex({
        troupeId: 1
      } , {
        background: true,
        unique: true,
        partialFilterExpression: {
          troupeId: { $exists: true }
        }
      },
      function(err) {
        if (err) throw err;
      });

    SecurityDescriptor.collection.createIndex({
        groupId: 1
      } , {
        background: true,
        unique: true,
        partialFilterExpression: {
          groupId: { $exists: true }
        }
      },
      function(err) {
        if (err) throw err;
      });

    SecurityDescriptor.collection.createIndex({
        type: 1,
        linkPath: 1
      } , {
        background: true,
        partialFilterExpression: {
          linkPath: { $exists: true }
        }
      },
      function(err) {
        if (err) throw err;
      });

    SecurityDescriptor.collection.createIndex({
        type: 1,
        externalId: 1
      } , {
        background: true,
        partialFilterExpression: {
          externalId: { $exists: true }
        }
      },
      function(err) {
        if (err) throw err;
      });

    return {
      model: SecurityDescriptor,
      schema: SecurityDescriptorSchema
    };
  }
};
