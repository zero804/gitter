/*jshint globalstrict:true, trailing:false, unused:true, node:true */
/*global require: true, module: true */
"use strict";

var persistence              = require("./persistence-service");
var userService              = require("./user-service");
var appEvents                = require("../app-events");
var assert                   = require("assert");
var emailNotificationService = require("./email-notification-service");
var winston                  = require("winston");
var collections              = require("../utils/collections");
var mongoUtils               = require("../utils/mongo-utils");
var Q                        = require("q");
var ObjectID                 = require('mongodb').ObjectID;
var _                        = require('underscore');
var assert                   = require('assert');
var statsService             = require("../services/stats-service");
var permissionsModel         = require("./permissions-model");


function ensureExists(value) {
  if(!value) throw 404;
  return value;
}

function findByUri(uri, callback) {
  return persistence.Troupe.findOneQ({uri: uri})
    .nodeify(callback);
}

function findAllByUri(uris, callback) {
  return persistence.Troupe.where('uri').in(uris).execQ()
    .nodeify(callback);
}


function findByIds(ids, callback) {
  return persistence.Troupe
    .where('_id')['in'](collections.idsIn(ids))
    .execQ()
    .nodeify(callback);
}

function findById(id, callback) {
  assert(mongoUtils.isLikeObjectId(id));

  return persistence.Troupe.findByIdQ(id)
    .nodeify(callback);
}

function findByIdRequired(id) {
  assert(mongoUtils.isLikeObjectId(id));

  return persistence.Troupe.findByIdQ(id)
    .then(ensureExists);
}

/**
 * Like model.createQ, but invokes mongoose middleware
 */
function createQ(ModelType, options) {
  var m = new ModelType(options);
  return m.saveQ()
    .then(function() {
      return m;
    });
}

function findMemberEmails(id, callback) {
  findById(id, function(err,troupe) {
    if(err) callback(err);
    if(!troupe) callback("No troupe returned");

    var userIds = troupe.getUserIds();

    userService.findByIds(userIds, function(err, users) {
      if(err) callback(err);
      if(!users) callback("No users returned");

      var emailAddresses = users.map(function(item) { return item.email; } );

      callback(null, emailAddresses);
    });

  });
}

function findAllTroupesForUser(userId, callback) {
  return persistence.Troupe
    .where('users.userId', userId)
    .sort({ name: 'asc' })
    .execQ()
    .nodeify(callback);
}

function findAllTroupesIdsForUser(userId, callback) {
  return persistence.Troupe
    .where('users.userId', userId)
    .select('id')
    .execQ()
    .then(function(result) {
      var troupeIds = result.map(function(troupe) { return troupe.id; } );
      return troupeIds;
    })
    .nodeify(callback);
}

function userHasAccessToTroupe(user, troupe) {
  return troupe.containsUserId(user.id);
}

function userIdHasAccessToTroupe(userId, troupe) {
  return troupe.containsUserId(userId);
}

function validateTroupeEmail(options, callback) {
  var from = options.from;
  var to = options.to;

  /* TODO: Make this email parsing better! */
  var uri = to.split('@')[0];

  userService.findByEmail(from, function(err, fromUser) {
    if(err) return callback(err);
    if(!fromUser) return callback("Access denied");

    findByUri(uri, function(err, troupe) {
      if(err) return callback(err);
      if(!troupe) return callback("Troupe not found for uri " + uri);

      if(!userHasAccessToTroupe(fromUser, troupe)) {
        return callback("Access denied");
      }

      return callback(null,troupe, fromUser);

    });
  });
}

function validateTroupeEmailAndReturnDistributionList(options, callback) {
  var from = options.from;
  var to = options.to;

  /* TODO: Make this email parsing better! */
  var uri = to.split('@')[0];

  userService.findByEmail(from, function(err, fromUser) {
    if(err) return callback(err);
    if(!fromUser) return callback("Access denied");

    findByUri(uri, function(err, troupe) {
      if(err) return callback(err);
      if(!troupe) return callback("Troupe not found for uri " + uri);
      if(!userHasAccessToTroupe(fromUser, troupe)) {
        return callback("Access denied");
      }

      userService.findByIds(troupe.getUserIds(), function(err, users) {
        if(err) return callback(err);

        var emailAddresses = users.map(function(user) {
          return user.email;
        });

        return callback(null, troupe, fromUser, emailAddresses);
      });
    });
  });
}

/*
 * This function takes in a userId and a list of troupes
 * It returns a hash that tells whether the user has access to each troupe,
 * or null if the troupe represented by the uri does not exist.
 * For example:
 * For the input validateTroupeUrisForUser('1', ['a','b','c'],...)
 * The callback could return:
 * {
 *   'a': true,
 *   'b': false,
 *   'c': null
 * }
 * Mean: User '1' has access to 'a', no access to 'b' and no troupe 'c' exists
 */
function validateTroupeUrisForUser(userId, uris, callback) {
  persistence.Troupe
    .where('uri')['in'](uris)
    .where('status', 'ACTIVE')
    .exec(function(err, troupes) {
      if(err) return callback(err);

      var troupesByUris = collections.indexByProperty(troupes, "uri");

      var result = {};
      uris.forEach(function(uri) {
        var troupe = troupesByUris[uri];
        if(troupe) {
          result[uri] = troupe.containsUserId(userId);
        } else {
          result[uri] = null;
        }
      });

      callback(null, result);
    });
}

/**
 * Add the specified user to the troupe,
 * @param {[type]} userId
 * @param {[type]} troupeId
 * returns a promise with the troupe
 */
function addUserIdToTroupe(userId, troupeId) {
  assert(mongoUtils.isLikeObjectId(userId));
  assert(mongoUtils.isLikeObjectId(troupeId));

  return findByIdRequired(troupeId)
      .then(function(troupe) {
        if(troupe.status != 'ACTIVE') throw { troupeNoLongerActive: true };

        if(troupe.containsUserId(userId)) {
          return troupe;
        }

        appEvents.richMessage({eventName: 'userJoined', troupe: troupe, userId: userId, user: user});

        troupe.addUserById(userId);
        return troupe.saveQ()
            .then(function() { return troupe; });
      });
}

/**
 * Returns the URL a particular user would see if they wish to view a URL.
 * NB: this call has to query the db to get a user's username. Don't call it
 * inside a loop!
 *
 * @return promise of a URL string
 */
function getUrlForTroupeForUserId(troupe, userId) {
  if(!troupe.oneToOne) {
    return Q.resolve("/" + troupe.uri);
  }

  var otherTroupeUser = troupe.users.filter(function(troupeUser) {
    return troupeUser.userId != userId;
  })[0];

  if(!otherTroupeUser) throw "Unable to determine other user for troupe#" + troupe.id;

  return userService.findUsernameForUserId(otherTroupeUser.userId)
    .then(function(username) {
      return username ? "/" + username
                      : "/one-one/" + otherTroupeUser.userId;
    });

}


function indexTroupesByUserIdTroupeId(troupes, userId) {
  var groupTroupeIds = troupes
                        .filter(function(t) { return !t.oneToOne; })
                        .map(function(t) { return t.id; });

  var oneToOneUserIds = troupes
                              .filter(function(t) { return t.oneToOne; })
                              .map(function(t) { return t.getOtherOneToOneUserId(userId); });

  return {
    oneToOne: collections.hashArray(oneToOneUserIds),
    groupTroupeIds: collections.hashArray(groupTroupeIds)
  };
}



function removeUserFromTroupe(troupeId, userId, callback) {
  return findById(troupeId)
    .then(function(troupe) {
      if(!troupe) throw 404;

      // TODO: Add the user to a removeUsers collection
      var deleteRecord = new persistence.TroupeRemovedUser({
        userId: userId,
        troupeId: troupeId
      });

      return deleteRecord.saveQ()
        .then(function() {
          // TODO: Let the user know that they've been removed from the troupe (via email or something)
          troupe.removeUserById(userId);

          return troupe.saveQ();
        });
    })
    .nodeify(callback);
}


/**
 * Find the userIds of all the troupe.
 *
 * Candidate for redis caching potentially?
 */
function findUserIdsForTroupe(troupeId, callback) {
  return persistence.Troupe.findByIdQ(troupeId, 'users')
    .then(function(troupe) {
      return troupe.users.map(function(m) { return m.userId; });
    })
    .nodeify(callback);
}

/**
 * Returns a promise of the users hashed by lurk status
 * and githubType
 */
function findUserIdsForTroupeWithLurk(troupeId) {
  return persistence.Troupe.findByIdQ(troupeId, 'users githubType uri', { lean: true })
    .then(function(troupe) {
      var users = troupe.users.reduce(function(memo, v) {
        memo[v.userId] = !!v.lurk;
        return memo;
      }, {});

      troupe.users = users;
      return troupe;
    });
}

function updateTroupeName(troupeId, troupeName, callback) {
  return findByIdRequired(troupeId)
    .then(function(troupe) {
      troupe.name = troupeName;

      return troupe.saveQ()
        .then(function() {
          return troupe;
        });
    })
    .nodeify(callback);
}

// Returns true if the two users share a common troupe
// In future, will also return true if the users share an organisation
function findImplicitConnectionBetweenUsers(userId1, userId2, callback) {
  return persistence.Troupe.findOneQ({
          $and: [
            { 'users.userId': userId1 },
            { 'users.userId': userId2 }
          ]
        }, "_id")
    .then(function(troupe) {
      return !!troupe;
    })
    .nodeify(callback);
}

function findOneToOneTroupe(fromUserId, toUserId) {
  if(fromUserId == toUserId) throw "You cannot be in a troupe with yourself.";
  assert(fromUserId, 'fromUserId parameter required');
  assert(toUserId, 'fromUserId parameter required');

  /* Find the existing one-to-one.... */
  return persistence.Troupe.findOneQ({
        $and: [
          { oneToOne: true },
          { 'users.userId': fromUserId },
          { 'users.userId': toUserId }
        ]
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
    name: '',
    oneToOne: true,
    status: 'ACTIVE',
    githubType: 'ONETOONE',
    users: [ { _id: new ObjectID(), userId: userId1 },
             { _id: new ObjectID(), userId: userId2 }]
  };

  // Remove undefined fields
  Object.keys(insertFields).forEach(function(k) {
    if(insertFields[k] === undefined) {
      delete insertFields[k];
    }
  });

  return persistence.Troupe.updateQ(
    { $and: [
      { oneToOne: true },
      { 'users.userId': userId1 },
      { 'users.userId': userId2 }
      ]},
    {
      $setOnInsert: insertFields
    },
    {
      upsert: true,
    }).spread(function(numAffected, raw) {
      return persistence.Troupe.findOneQ(
        { $and: [
          { oneToOne: true },
          { 'users.userId': userId1 },
          { 'users.userId': userId2 }
          ]})
        .then(function(troupe) {
          if(!raw.upserted) return troupe;

          winston.verbose('Created a oneToOne troupe for ', { userId1: userId1, userId2: userId2 });

          statsService.event('new_troupe', {
            troupeId: troupe.id,
            oneToOne: true,
            userId: userId1,
            oneToOneUpgrade: false
          });

          // TODO: do this here to get around problems with
          // circular dependencies. This will probably need to change in
          // future
          var restSerializer = require('../serializers/rest-serializer');

          troupe.users.forEach(function(troupeUser) {
            var currentUserId = troupeUser.userId;
            var url = '/user/' + troupeUser.userId + '/troupes';

            var strategy = new restSerializer.TroupeStrategy({ currentUserId: currentUserId });

            restSerializer.serialize(troupe, strategy, function(err, serializedModel) {
              if(err) return winston.error('Error while serializing oneToOne troupe: ' + err, { exception: err });

              appEvents.dataChange2(url, 'create', serializedModel);
            });

          });

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
  if(fromUserId === toUserId) throw 417; // You cannot be in a troupe with yourself.

  return userService.findById(toUserId)
    .then(function(toUser) {
      if(!toUser) throw "User does not exist";

      /* Find the existing one-to-one.... */
      return [toUser, persistence.Troupe.findOneQ({
        $and: [
          { oneToOne: true },
          { 'users.userId': fromUserId },
          { 'users.userId': toUserId }
        ]
      })];
    })
    .spread(function(toUser, troupe) {
      // Found the troupe? Perfect!
      if(troupe) return [ troupe, toUser, null ];

      // For now, there is no permissions model between users
      // There is an implicit connection between these two users,
      // automatically create the troupe
      return findOrCreateOneToOneTroupe(fromUserId, toUserId)
        .then(function(troupe) {
          return [ troupe, toUser, null ];
        });

      // TODO: setup a permissions model for one to one chats

      // return findImplicitConnectionBetweenUsers(fromUserId, toUserId)
      //     .then(function(implicitConnection) {
      //       if(implicitConnection) {

      //         // There is an implicit connection between these two users,
      //         // automatically create the troupe
      //         return findOrCreateOneToOneTroupe(fromUserId, toUserId)
      //           .then(function(troupe) {
      //             return [ troupe, toUser, null ];
      //           });
      //       }

      //       // There is no implicit connection between the users, don't create the troupe
      //       // However, do tell the caller whether or not this user already has an invite to the
      //       // other user to connect

      //       // Otherwise the users cannot onnect the and the user will need to invite the other user
      //       // to connect explicitly.
      //       // Check if the user has already invited the other user to connect

      //       // Look to see if the other user has invited this user to connect....
      //       // NB from and to users are swapped around here as we are looking for the correlorary (sp)
      //       return findUnusedOneToOneInviteFromUserIdToUserId(toUserId, fromUserId)
      //         .then(function(invite) {
      //           return [ null, toUser, invite ];
      //         });

      //     });
    });

}

function createUniqueUri() {
  var chars = "0123456789abcdefghiklmnopqrstuvwxyz";

  var uri = "";
  for(var i = 0; i < 6; i++) {
    var rnum = Math.floor(Math.random() * chars.length);
    uri += chars.substring(rnum, rnum + 1);
  }

  return uri;
}

function updateTopic(user, troupe, topic) {
  /* First check whether the user has permission to work the topic */
  return permissionsModel(user, 'admin', troupe.uri, troupe.githubType)
    .then(function(access) {
      if(!access) throw 403; /* Forbidden */

      troupe.topic = topic;

      return troupe.saveQ()
        .then(function() {
          return troupe;
        });
    });
}

function updateTroupeLurkForUserId(userId, troupeId, lurk) {
  return findById(troupeId)
    .then(function(troupe) {
      var troupeUser = troupe.users.filter(function(troupeUser) { return troupeUser.userId == userId; })[0];
      if(troupeUser) {
        troupeUser.lurk = !!lurk;
      }

      /* Don't send out the traditional updates to all users */
      troupe._skipTroupeMiddleware = true;

      return troupe.saveQ();
    })
    .then(function() {
      // TODO: in future get rid of this but this collection is used by the native clients
      appEvents.dataChange2('/user/' + userId + '/troupes', 'patch', { id: troupeId, lurk: !!lurk });
    });
}


function findAllUserIdsForTroupes(troupeIds, callback) {
  if(!troupeIds.length) return callback(null, []);

  var mappedTroupeIds = troupeIds.map(function(d) {
    if(typeof d === 'string') return new ObjectID('' + d);
    return d;
  });

  return persistence.Troupe.aggregateQ([
    { $match: { _id: { $in: mappedTroupeIds } } },
    { $project: { _id: 0, 'users.userId': 1 } },
    { $unwind: '$users' },
    { $group: { _id: 1, userIds: { $addToSet: '$users.userId' } } }
    ])
    .then(function(results) {
      var result = results[0];
      if(!result || !result.userIds || !result.userIds.length) return [];

      return result.userIds;
    })
    .nodeify(callback);
}

function findAllUserIdsForTroupe(troupeId) {

  return persistence.Troupe.findByIdQ(troupeId, 'users', { lean: true })
    .then(function(troupe) {
      if(!troupe) throw 404;

      return troupe.users.map(function(troupeUser) { return troupeUser.userId; });
    });
}

function findAllUserIdsForUnconnectedImplicitContacts(userId, callback) {
  return Q.all([
      findAllImplicitContactUserIds(userId),
      findAllConnectedUserIdsForUserId(userId)
    ])
    .spread(function(implicitConnectionUserIds, alreadyConnectedUserIds) {
      alreadyConnectedUserIds = alreadyConnectedUserIds.map(function(id) { return "" + id; });

      return _.difference(implicitConnectionUserIds, alreadyConnectedUserIds);
    })
    .nodeify(callback);
}

function findAllConnectedUserIdsForUserId(userId) {
  userId = mongoUtils.asObjectID(userId);

  return persistence.Troupe.aggregateQ([
    { $match: { 'users.userId': userId, oneToOne: true } },
    { $project: { 'users.userId': 1, _id: 0 } },
    { $unwind: "$users" },
    { $group: { _id: '$users.userId', number: { $sum: 1 } } },
    { $project: { _id: 1 } }
  ]).then(function(results) {
    var a = results
            .map(function(item) { return item._id; })
            .filter(function(item) { return "" + item != "" + userId; });
    return a;
  });

}

function findAllImplicitContactUserIds(userId, callback) {
  userId = mongoUtils.asObjectID(userId);

  return persistence.Troupe.aggregateQ([
    { $match: { 'users.userId': userId } },
    { $project: { 'users.userId': 1, _id: 0 } },
    { $unwind: "$users" },
    { $group: { _id: '$users.userId', number: { $sum: 1 } } },
    { $project: { _id: 1 } }
  ]).then(function(results) {
    return results
          .map(function(item) { return "" + item._id; })
          .filter(function(item) { return item != userId; });

  }).nodeify(callback);

}

function deleteTroupe(troupe, callback) {
  if(troupe.status != 'ACTIVE') return callback("Troupe is not active");
  if(troupe.users.length !== 1) return callback("Can only delete troupes that have a single user");

  troupe.status = 'DELETED';
  troupe.dateDeleted = new Date();
  troupe.removeUserById(troupe.users[0].userId);
  troupe.saveQ()
    .then(function() {
      appEvents.troupeDeleted(troupe.id);
    })
    .thenResolve(troupe)
    .nodeify(callback);
}

module.exports = {
  findByUri: findByUri,
  findAllByUri: findAllByUri,
  findById: findById,
  findByIds: findByIds,
  findAllTroupesForUser: findAllTroupesForUser,
  findAllTroupesIdsForUser: findAllTroupesIdsForUser,
  validateTroupeEmail: validateTroupeEmail,
  validateTroupeEmailAndReturnDistributionList: validateTroupeEmailAndReturnDistributionList,
  userHasAccessToTroupe: userHasAccessToTroupe,
  userIdHasAccessToTroupe: userIdHasAccessToTroupe,
  findMemberEmails: findMemberEmails,

  findImplicitConnectionBetweenUsers: findImplicitConnectionBetweenUsers,
  findAllUserIdsForUnconnectedImplicitContacts: findAllUserIdsForUnconnectedImplicitContacts,
  findAllImplicitContactUserIds: findAllImplicitContactUserIds,
  findAllConnectedUserIdsForUserId: findAllConnectedUserIdsForUserId,
  getUrlForTroupeForUserId: getUrlForTroupeForUserId,

  removeUserFromTroupe: removeUserFromTroupe,

  findAllUserIdsForTroupes: findAllUserIdsForTroupes,
  findAllUserIdsForTroupe: findAllUserIdsForTroupe,
  findUserIdsForTroupeWithLurk: findUserIdsForTroupeWithLurk,
  findUserIdsForTroupe: findUserIdsForTroupe,

  validateTroupeUrisForUser: validateTroupeUrisForUser,
  updateTroupeName: updateTroupeName,
  findOneToOneTroupe: findOneToOneTroupe,
  findOrCreateOneToOneTroupeIfPossible: findOrCreateOneToOneTroupeIfPossible,
  createUniqueUri: createUniqueUri,
  deleteTroupe: deleteTroupe,

  // createNewTroupeForExistingUser: createNewTroupeForExistingUser,
  indexTroupesByUserIdTroupeId: indexTroupesByUserIdTroupeId,

  findOrCreateOneToOneTroupe: findOrCreateOneToOneTroupe,

  updateTopic: updateTopic,
  updateTroupeLurkForUserId: updateTroupeLurkForUserId

};
