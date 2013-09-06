/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var contactService            = require('./contact-service');
var troupeService             = require('./troupe-service');
var userService               = require('./user-service');
var persistence               = require('./persistence-service');
var Q                         = require('q');
var collections               = require('../utils/collections');
var redis                     = require("../utils/redis");
var mongoUtils                = require('../utils/mongo-utils');
var check                     = require('validator').check;

var redisClient               = redis.createClient();
var redisClient_exists        = Q.nbind(redisClient.exists, redisClient);
var redisClient_setex         = Q.nbind(redisClient.setex, redisClient);

/* const */
var IMPLICIT_CONTACT          = 16;
var SCORE_TROUPE_CONTACT      = 4;
var SCORE_NON_TROUPE_CONTACT  = 2;
var REVERSE_CONTACT           = 1;

var MAX_CACHE_TIME            = 300;

function lower(array) {
  return array.map(function(s) { return s.toLowerCase(); });
}

function addContacts(userId, dateGenerated) {
  userId = "" + userId;
  return contactService.findContactsForUserId(userId)
    .then(function(contacts) {

      return Q.all(contacts.map(function(contact) {
          var emails = lower(contact.emails);

          var update = {
            $addToSet:  { emails: { $each: emails },
                          knownEmails: { $each: emails }
                        },
            $set:       { name: contact.name,
                          userId: userId,
                          dateGenerated: dateGenerated }
          };

          if(contact.contactUserId) {
            update.$inc = { score: SCORE_TROUPE_CONTACT };
            update.$set.contactUserId = contact.contactUserId;
          } else {
            update.$inc = { score: SCORE_NON_TROUPE_CONTACT };
          }


          return persistence.SuggestedContact.updateQ(
                  { emails: { $in: emails }, userId: userId },
                  update,
                  { upsert: true });

        }));

    });
}


function addReverseContacts(userId, dateGenerated) {
  return contactService.findReverseContactsForUserId(userId)
    .then(function(contacts) {
      var userIds = contacts.map(function(contact) { return contact.userId; });

      return userService.findByIds(userIds)
        .then(function(users) {
          users = collections.indexById(users);

          return Q.all(contacts.map(function(contact) {
            var user = users[contact.userId];
            if(!user) return;

            var emails = [user.email].concat(user.emails);


            return persistence.SuggestedContact.updateQ(
                    { emails: { $in: emails }, userId: userId },
                    { $inc:       { score: REVERSE_CONTACT },
                      $addToSet:  { emails: { $each: emails } },
                      $set:       { name: user.displayName,
                                    userId: userId,
                                    contactUserId: user._id,
                                    username: user.username || null,
                                    dateGenerated: dateGenerated }
                    },
                    { upsert: true });

          }));
        });

    });
}


function addImplicitConnections(userId, dateGenerated) {
  return troupeService.findAllImplicitContactUserIds(userId)
    .then(function(userIds) {
      return userService.findByIds(userIds)
        .then(function(users) {

          return Q.all(users.map(function(user) {
            var emails = [user.email].concat(user.emails);

            return persistence.SuggestedContact.updateQ(
                    { emails:     { $in: emails },
                      userId:     userId },
                    { $inc:       { score: IMPLICIT_CONTACT },
                      $addToSet:  { emails: { $each: emails } },
                      $set:       { name: user.displayName,
                                    contactUserId: user.id,
                                    userId: userId,
                                    username: user.username || null,
                                    dateGenerated: dateGenerated }
                    },
                    { upsert: true });

          }));


    });
  });
}

/**
 * Generate suggested contacts for a user
 */
function removeAllSuggestionsForUser(userId) {
  return persistence.SuggestedContact.removeQ({ userId: userId });
}

/**
 * Generate suggested contacts for a user
 */
function generateSuggestedContactsForUser(userId) {
  var dg = Date.now();
  userId = mongoUtils.asObjectID(userId);

  return removeAllSuggestionsForUser(userId)
    .then(function() {

      return Q.all([
          addContacts(userId, dg),
          addReverseContacts(userId, dg),
          addImplicitConnections(userId, dg)
        ]);

    })
    .then(function() {
      // Always remove the user from his own suggested contacts
      return persistence.SuggestedContact.removeQ({ userId: userId, contactUserId: userId });
    })
    .then(function() {
      // TODO: this is not ATOMIC. It could lead to wierd data caching issues later on
      // you have been warned.
      return redisClient_setex('sc:' + userId, MAX_CACHE_TIME, '1');
    });
}


function createRegExpsForQuery(queryText) {
  var normalized = ("" + queryText).trim().toLowerCase();
  var parts = normalized.split(/[\s\'']+/)
                        .filter(function(s) { return !!s; })
                        .filter(function(s, index) { return index < 10; } );

  return parts.map(function(i) {
      return new RegExp("\\b" + i, "i");
    });
}

function searchifyResults(skip, limit) {
  return function(results) {
    return {
      hasMoreResults: undefined,
      limit: limit,
      skip: skip,
      results: results
    };
  };
}

function addEmailAddress(queryText) {
  return function(results) {
    if(results.length === 0 && isValidEmailAddress(queryText)) {
      results = [{
        name: queryText,
        emails: [queryText],
        knownEmails: [queryText]
      }];
    }

    return results;
  };
}

function isValidEmailAddress(email) {
  try {
    check(email).isEmail();
    return true;
  } catch(e) {
    return false;
  }
}

function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

function findSuggestedContacts(userId, options) {
  var excludeTroupeId = options.excludeTroupeId;
  var excludeConnected = options.excludeConnected;
  var queryText = options.query;
  var limit = options.limit || 20;
  var skip = options.skip || 0;

  var query = persistence.SuggestedContact.find({ userId: userId })
        .limit(limit)
        .skip(skip)
        .sort({ score: -1, name: 1 });

  var queryTextSearch;

  if(queryText) {
    if(isValidEmailAddress(queryText)) {

      queryTextSearch = { $or: [ { knownEmails: new RegExp('^' + escapeRegExp(queryText) )}, { emails: queryText }] };
    } else {
      var res = createRegExpsForQuery(queryText);
      queryTextSearch = { $or: [ { name: { $all: res } }, { username: { $all: res } }, { knownEmails: { $all: res } } ] };
    }
  }

  if(!excludeTroupeId && !excludeConnected) {
    if(queryTextSearch) query.find(queryTextSearch);

    return query.execQ().then(addEmailAddress(queryText)).then(searchifyResults(skip, limit));
  }

  var ops = [];
  if(excludeTroupeId) ops.push(troupeService.findAllUserIdsForTroupe(excludeTroupeId));
  if(excludeConnected) ops.push(troupeService.findAllConnectedUserIdsForUserId(userId));

  return Q.all(ops)
    .then(function(results) {
      var terms = [queryTextSearch];

      if(excludeTroupeId) {
        var troupeUserIds = results.shift();

        terms.push({ $or: [
          { contactUserId: { $exists: false } },
          { $not: { contactUserId: { $in: troupeUserIds } } }
        ]});

      }

      if(excludeConnected) {
        var connectedUserIds = results.shift();

        terms.push({ $or: [
          { contactUserId: { $exists: false } },
          { $not: { contactUserId: { $in: connectedUserIds } } }
        ]});
      }

      query.find({ $and: terms });

      return query.execQ()
        .then(addEmailAddress(queryText))
        .then(searchifyResults(skip, limit));

    });


}

/**
 * Returns the promise of suggested contacts
 */
exports.fetchSuggestedContactsForUser = function(userId, options) {
  return redisClient_exists('sc:' + userId)
    .then(function(exists) {
      if(exists) {
        return findSuggestedContacts(userId, options);
      }

      return generateSuggestedContactsForUser(userId)
        .then(function() {
          return findSuggestedContacts(userId, options);
        });

    });

};

