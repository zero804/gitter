"use strict";

var env                      = require('gitter-web-env');
var stats                    = env.stats;

var userService           = require('./user-service');
var persistence           = require('./persistence-service');
var assert                = require("assert");
var mongoUtils            = require("../utils/mongo-utils");
var Promise               = require('bluebird');
var ObjectID              = require('mongodb').ObjectID;
var assert                = require('assert');
var roomPermissionsModel  = require('./room-permissions-model');
var mongooseUtils         = require('../utils/mongoose-utils');
var StatusError           = require('statuserror');
var roomMembershipService = require('./room-membership-service');
var getMaxTagLength       = require('gitter-web-shared/validation/validate-tag').getMaxTagLength;
var debug                 = require('debug')('gitter:troupe-service');

var MAX_RAW_TAGS_LENGTH = 200;

function findByUri(uri, callback) {
  var lcUri = uri.toLowerCase();

  return persistence.Troupe.findOne({ lcUri: lcUri })
    .exec()
    .nodeify(callback);
}

function findByIds(ids, callback) {
  return mongooseUtils.findByIds(persistence.Troupe, ids, callback);
}

function findByIdsLean(ids, select) {
  return mongooseUtils.findByIdsLean(persistence.Troupe, ids, select);
}

function findById(id, callback) {
  assert(mongoUtils.isLikeObjectId(id));

  return persistence.Troupe.findById(id)
    .exec()
    .nodeify(callback);
}

function checkIdExists(id) {
  return persistence.Troupe.findById(id)
    .count()
    .exec()
    .then(function(count) {
      return count > 0;
    });

}

/**
 * [{troupe without users}, userIsInRoom:boolean]
 */
function findByIdLeanWithAccess(troupeId, userId) {
  troupeId = mongoUtils.asObjectID(troupeId);
  if (userId) {
    return Promise.join(
      persistence.Troupe.findOne({ _id: troupeId }, { }, { lean: true }).exec(),
      roomMembershipService.checkRoomMembership(troupeId, userId),
      function(leanTroupe, access) {
        if (!leanTroupe) return [null, false];
        leanTroupe.id = mongoUtils.serializeObjectId(leanTroupe._id);
        return [leanTroupe, access];
      });
  }

  // Query without userId
  return persistence.Troupe.findOne({ _id: troupeId }, { }, { lean: true })
    .exec()
    .then(function(result) {
      if (!result) return [null, false];
      result.id = mongoUtils.serializeObjectId(result._id);
      return [result, false];
    });
}

function findOneToOneTroupe(fromUserId, toUserId) {
  if(fromUserId == toUserId) throw "You cannot be in a troupe with yourself.";
  assert(fromUserId, 'fromUserId parameter required');
  assert(toUserId, 'fromUserId parameter required');

  /* Find the existing one-to-one.... */
  return persistence.Troupe.findOne({
        $and: [
          { oneToOne: true },
          { 'oneToOneUsers.userId': fromUserId },
          { 'oneToOneUsers.userId': toUserId }
        ]
    })
    .exec();
}

/**
 * Returns true if the GitHub type for the uri matches
 * the provided github type
 */
function checkGitHubTypeForUri(uri, githubType) {
  var lcUri = uri.toLowerCase();

  return persistence.Troupe.count({ lcUri: lcUri, githubType: githubType })
    .exec()
    .then(function(count) {
      return !!count;
    });
}
/**
 * Create a one-to-one troupe if one doesn't exist, otherwise return the existing one.
 *
 * Does not check if the users have implicit connections - it always creates
 * the one to one
 *
 * NB NB NB: this is not atomic, so if two users try create the same troupe
 * at the same moment (to the millisecond) things will get nasty!
 *
 * @return {troupe} Promise of a troupe
 */
function findOrCreateOneToOneTroupe(userId1, userId2) {
  assert(userId1, "Need to provide user 1 id");
  assert(userId2, "Need to provide user 2 id");

  userId1 = mongoUtils.asObjectID(userId1);
  userId2 = mongoUtils.asObjectID(userId2);

  var insertFields = {
    oneToOne: true,
    status: 'ACTIVE',
    githubType: 'ONETOONE',
    oneToOneUsers: [ { _id: new ObjectID(), userId: userId1 },
             { _id: new ObjectID(), userId: userId2 }],
    userCount: 2
  };

  // Remove undefined fields
  Object.keys(insertFields).forEach(function(k) {
    if(insertFields[k] === undefined) {
      delete insertFields[k];
    }
  });

  // Need to use $elemMatch due to a regression in Mongo 2.6, see https://jira.mongodb.org/browse/SERVER-13843
  return mongooseUtils.upsert(persistence.Troupe, {
      $and: [
        { oneToOne: true },
        { 'oneToOneUsers': {$elemMatch: { userId: userId1 } }},
        { 'oneToOneUsers': {$elemMatch: { userId: userId2 } }}
        ]},
      {
        $setOnInsert: insertFields
      })
    .spread(function(troupe, updatedExisting) {
      debug("One-to-one upsert updated an existing document? %s", updatedExisting);
      if(updatedExisting) return troupe;

      return roomMembershipService.addRoomMembers(troupe.id, [userId1, userId2])
        .then(function() {
          debug('Created a oneToOne troupe for %s and %s', userId1, userId2);

          stats.event('new_troupe', {
            troupeId: troupe.id,
            oneToOne: true,
            userId: userId1,
            oneToOneUpgrade: false
          });

          // FIXME: NOCOMMIT make this work
          // TODO: do this here to get around problems with
          // circular dependencies. This will probably need to change in
          // future
          // var restSerializer = require('../serializers/rest-serializer');
          //
          // [userId1, userId2].forEach(function(currentUserId) {
          //   var url = '/user/' + currentUserId + '/rooms';
          //
          //   var strategy = new restSerializer.TroupeStrategy({ currentUserId: currentUserId });
          //
          //   restSerializer.serializeObject(troupe, strategy, function(err, serializedModel) {
          //     if(err) return logger.error('Error while serializing oneToOne troupe: ' + err, { exception: err });
          //     appEvents.dataChange2(url, 'create', serializedModel);
          //   });
          // });

          return troupe;
        });
    });
}

/**
 * Find a one-to-one troupe, otherwise create it if possible (if there is an implicit connection),
 * otherwise return the existing invite if possible
 *
 * @return {[ troupe, other-user, invite ]}
 */
function findOrCreateOneToOneTroupeIfPossible(fromUserId, toUserId) {
  assert(fromUserId, 'fromUserId parameter required');
  assert(toUserId, 'toUserId parameter required');

  if("" + fromUserId === "" + toUserId) throw new StatusError(417); // You cannot be in a troupe with yourself.

  return Promise.join(
    userService.findById(toUserId),
    persistence.Troupe.findOne({
      $and: [
        { oneToOne: true },
        { 'oneToOneUsers.userId': fromUserId },
        { 'oneToOneUsers.userId': toUserId }
      ]
    }).exec(),
    function(toUser, troupe) {
      if(!toUser) throw new StatusError(404, "User does not exist");

      // Found the troupe? Perfect!
      if(troupe) return [ troupe, toUser, null ];

      // For now, there is no permissions model between users
      // There is an implicit connection between these two users,
      // automatically create the troupe
      return findOrCreateOneToOneTroupe(fromUserId, toUserId)
        .then(function(troupe) {
          return [ troupe, toUser, null ];
        });

    });

}

function updateTopic(user, troupe, topic) {
  /* First check whether the user has permission to work the topic */
  return roomPermissionsModel(user, 'admin', troupe)
    .then(function(access) {
      if(!access) throw new StatusError(403); /* Forbidden */

      troupe.topic = topic;

      return troupe.save()
        .then(function() {
          return troupe;
        });
    });
}

function toggleSearchIndexing(user, troupe, bool) {
  return roomPermissionsModel(user, 'admin', troupe)
    .then(function(access) {
      if(!access) throw new StatusError(403); /* Forbidden */

      troupe.noindex = bool;

      return troupe.save()
        .then(function() {
          return troupe;
        });
    });
}

function updateTags(user, room, tags) {
  var reservedTagTestRegex = (/:/);
  var isStaff = user.get('staff');

  return Promise.resolve(isStaff || roomPermissionsModel(user, 'admin', room))
    .then(function(access) {
      if(!access) throw new StatusError(403); /* Forbidden */

      var cleanTags = tags.trim().slice(0, MAX_RAW_TAGS_LENGTH).split(',')
        .filter(function(tag) {
          return !!tag; //
        })
        .map(function(tag) {
          return tag.trim().slice(0, getMaxTagLength(isStaff));
        })
        .filter(function(tag) {
          // staff can do anything
          if(isStaff) {
            return true;
          }
          // Users can only save, non-reserved tags
          if(!reservedTagTestRegex.test(tag)) {
            return true;
          }

          return false;
        });

      // Make sure a normal user doesn't clear out our already existing reserved-word(with colons) tags
      var reservedTags = [];
      if(!isStaff) {
        reservedTags = room.tags
          .filter(function(tag) {
            return reservedTagTestRegex.test(tag);
          });
      }

      room.tags = [].concat(cleanTags, reservedTags);

      return room.save()
        .then(function() {
          return room;
        });
    });
}


function findChildRoomsForOrg(org, opts) {
  if (!org) return Promise.resolve([]);
  opts = opts || {};

  var query = { lcOwner: org.toLowerCase() };
  if (opts.security) query.security = opts.security;

  return persistence.Troupe.find(query)
    .sort({ userCount: 'desc' })
    .exec();
}


module.exports = {
  findByUri: findByUri,
  findById: findById,
  checkIdExists: checkIdExists,
  findByIds: findByIds,
  findByIdsLean: findByIdsLean,
  findByIdLeanWithAccess: findByIdLeanWithAccess,
  findOneToOneTroupe: findOneToOneTroupe,
  findOrCreateOneToOneTroupeIfPossible: findOrCreateOneToOneTroupeIfPossible,
  findOrCreateOneToOneTroupe: findOrCreateOneToOneTroupe,
  updateTopic: updateTopic,
  toggleSearchIndexing: toggleSearchIndexing,
  checkGitHubTypeForUri: checkGitHubTypeForUri,
  findChildRoomsForOrg: findChildRoomsForOrg,
  updateTags: updateTags
};
