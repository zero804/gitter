'use strict';

var Promise = require('bluebird');
var TroupeInvite = require('gitter-web-persistence').TroupeInvite;
var uuid = require('node-uuid');
var assert = require('assert');
var StatusError = require('statuserror');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');

var MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 *
 */
function createInvite(roomId, options) {
  var type = options.type;
  var externalId = options.externalId;
  var invitedByUserId = options.invitedByUserId;
  var emailAddress = options.emailAddress;

  if (type === 'email') {
    // Email address is mandatory
    if (!emailAddress) throw new StatusError(400);
    externalId = emailAddress;
  } else {
    if (!externalId) throw new StatusError(400);
    // Email address is optional
  }

  externalId = externalId.toLowerCase();
  var secret = uuid.v4();
  return TroupeInvite.create({
      troupeId: roomId,
      type: type,
      externalId: externalId,
      emailAddress: emailAddress,
      userId: null,
      secret: secret,
      invitedByUserId: invitedByUserId,
      state: 'PENDING'
    })
    .catch(mongoUtils.mongoErrorWithCode(11000), function() {
      throw new StatusError(409); // Conflict
    });
}

/**
 *
 */
function accept(userId, secret) {
  assert(secret);
  return TroupeInvite.findOne({ secret: String(secret) })
    .lean()
    .exec()
    .then(function(invite) {
      if (!invite) throw new StatusError(404);
      if (invite.userId) {
        // Is this user re-using the invite?
        if (!mongoUtils.objectIDsEqual(invite.userId, userId)) {
          throw new StatusError(404);
        }
      }

      return invite;
    });
}

/**
 *
 */
function markInviteAccepted(inviteId, userId) {
  return TroupeInvite.update({
      _id: inviteId,
      state: { $ne: 'ACCEPTED' }
    }, {
      $set: {
        state: 'ACCEPTED',
        userId: userId
      }
    })
    .exec();
}

/**
 *
 */
function markInviteRejected(inviteId, userId) {
  return TroupeInvite.update({
      _id: inviteId,
      state: { $ne: 'REJECTED' }
    }, {
      $set: {
        state: 'REJECTED',
        userId: userId
      }
    })
    .exec();
}

/**
 *
 */
function markInviteReminded(inviteId) {
  return TroupeInvite.update({
      _id: inviteId
    }, {
      $set: {
        reminderSent: new Date()
      }
    })
    .exec();
}

function findInvitesForReminder(timeHorizonDays) {
  var cutoffId = mongoUtils.createIdForTimestamp(Date.now() - timeHorizonDays * MS_PER_DAY);
  return TroupeInvite.aggregate([{
      $match: {
        state: 'PENDING',
        _id: { $lt: cutoffId },
        reminderSent: null,
      }
    }, {
      $project: {
        _id: 0,
        invite: '$$ROOT'
      }
    },{
      $lookup: {
        from: 'troupes',
        localField: 'invite.troupeId',
        foreignField: '_id',
        as: 'troupe'
      }
    },{
      $unwind: {
        path: '$troupe',
        preserveNullAndEmptyArrays: true
      }
    },{
      $lookup: {
        from: 'users',
        localField: 'invite.invitedByUserId',
        foreignField: '_id',
        as: 'invitedByUser'
      }
    },{
      $unwind: {
        path: '$invitedByUser',
        preserveNullAndEmptyArrays: true
      }
    }])
    .exec();
}

module.exports = {
  createInvite: Promise.method(createInvite),
  accept: Promise.method(accept),
  markInviteAccepted: Promise.method(markInviteAccepted),
  markInviteRejected: Promise.method(markInviteRejected),
  findInvitesForReminder: findInvitesForReminder,
  markInviteReminded: markInviteReminded,
}
