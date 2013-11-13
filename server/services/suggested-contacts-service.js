/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var contactService            = require('./contact-service');
var troupeService             = require('./troupe-service');
var inviteService             = require('./invite-service');
var userService               = require('./user-service');
var appEvents                 = require('../app-events');
var persistence               = require('./persistence-service');
var Q                         = require('q');
var collections               = require('../utils/collections');
var redis                     = require("../utils/redis");
var mongoUtils                = require('../utils/mongo-utils');
var check                     = require('validator').check;
var assert                    = require('assert');

var redisClient               = redis.createClient();
var redisClient_exists        = Q.nbind(redisClient.exists, redisClient);
var redisClient_setex         = Q.nbind(redisClient.setex, redisClient);
var redisClient_del           = Q.nbind(redisClient.del, redisClient);

/* const */
var PENDING_INVITE            = 128;
var INVITE                    = 64;
var REVERSE_INVITE            = 32;
var IMPLICIT_CONTACT          = 16;
var SCORE_TROUPE_CONTACT      = 4;
var SCORE_NON_TROUPE_CONTACT  = 2;
var REVERSE_CONTACT           = 1;

var MAX_CACHE_TIME            = 300;

function lower(array) {
  return array.map(function(s) { return s.toLowerCase(); });
}

function matchingContact(userId, contactUserId, emails) {
  if(emails && emails.length === 0) emails = null;

  assert(userId, 'userId required');
  assert(contactUserId || emails && emails.length, 'contactUserId or one or more email addresses required');

  if(contactUserId && !emails) {
    return { $and:  [{ userId: userId },
                     { contactUserId: contactUserId }
                    ]};
  }

  if(emails && !contactUserId) {
    return { $and:  [{ userId:   userId },
                     { emails: { $in: emails } }
                    ]};
  }

  return { $and:  [{ userId: userId },
                   { $or: [ { contactUserId: contactUserId },
                            { emails:        { $in: emails } } ]}
                  ]};
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
                  matchingContact(userId, contact.contactUserId, emails),
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
            return increaseContactRanking(user, userId, emails, dateGenerated, REVERSE_CONTACT);
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
            return increaseContactRanking(user, userId, emails, dateGenerated, IMPLICIT_CONTACT);
          }));

    });
  });
}

function addOutgoingPendingInvites(userId, dateGenerated) {
  return inviteService.findAllUnusedInvitesFromUserId(userId)
    .then(function(invites) {
      var inviteeUserIds = invites.map(function(i) { return i.userId; }).filter(function(b) { return !!b; });

      return (inviteeUserIds.length ? userService.findByIds(inviteeUserIds) : Q.resolve([]))
        .then(function(inviteeUsers) {
          var inviteeUsersIndexed = collections.indexById(inviteeUsers);

          return Q.all(invites.map(function(invite) {
            var emails;

            if(invite.userId) {
              var inviteeUser = inviteeUsersIndexed[invite.userId];
              if(!inviteeUser) return; // Nothing to insert

              emails = inviteeUser.getAllEmails();
              return increaseContactRanking(inviteeUser, userId, emails, dateGenerated, PENDING_INVITE);
            } else {
              return increaseUnconfirmedContactRanking(userId, invite, dateGenerated, PENDING_INVITE);
            }
          }));

        });

  });
}

function addOutgoingConfirmedInvites(userId, dateGenerated) {
  return Q.all([
      inviteService.findAllUsedInvitesFromUserId(userId),
    ])
    .spread(function(invites) {
      var inviteeUserIds = invites.map(function(i) { return i.userId; }).filter(function(b) { return !!b; });

      return (inviteeUserIds.length ? userService.findByIds(inviteeUserIds) : Q.resolve([]))
        .then(function(inviteeUsers) {
          var inviteeUsersIndexed = collections.indexById(inviteeUsers);

          return Q.all(invites.map(function(invite) {
            var emails;

            if(invite.userId) {
              var inviteeUser = inviteeUsersIndexed[invite.userId];
              if(!inviteeUser) return; // Nothing to insert

              emails = inviteeUser.getAllEmails();
              return increaseContactRanking(inviteeUser, userId, emails, dateGenerated, INVITE);
            } else {
              return increaseUnconfirmedContactRanking(userId, invite, dateGenerated, INVITE);
            }
          }));

        });

  });
}

function addIncomingInvites(userId, dateGenerated) {
  return Q.all([
      inviteService.findAllUsedInvitesForUserId(userId),
      inviteService.findAllUnusedInvitesForUserId(userId)
    ])
    .spread(function(usedInvites, unusedInvites) {
      var invites = usedInvites.concat(unusedInvites);
      var inviterUserIds = invites.map(function(i) { return i.fromUserId; });

      return userService.findByIds(inviterUserIds)
        .then(function(inviterUsers) {

          return Q.all(inviterUsers.map(function(inviterUser) {
            var emails = inviterUser.getAllEmails();
            return increaseContactRanking(inviterUser, userId, emails, dateGenerated, REVERSE_INVITE);
          }));

        });

  });
}

function increaseContactRanking(user, userId, emails, dateGenerated, score) {
  return persistence.SuggestedContact.updateQ(
          matchingContact(userId, user.id, emails),
          { $inc:       { score: score },
            $addToSet:  { emails: { $each: emails } },
            $set:       { name: user.getDisplayName(),
                          contactUserId: user.id,
                          userId: userId,
                          username: user.username || null,
                          dateGenerated: dateGenerated }
          },
          { upsert: true });
}

function increaseUnconfirmedContactRanking(userId, invite, dateGenerated, score) {
  return persistence.SuggestedContact.updateQ(
        matchingContact(userId, null, [invite.email]),
        { $inc:       { score: score },
          $addToSet:  { emails: { $each: [invite.email] },
                        knownEmails: { $each: [invite.email] } },
          $set:       { name: invite.displayName || invite.email.split('@')[0],
                        userId: userId,
                        dateGenerated: dateGenerated }
        },
        { upsert: true });
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
          addImplicitConnections(userId, dg),
          addOutgoingPendingInvites(userId, dg),
          addOutgoingConfirmedInvites(userId, dg),
          addIncomingInvites(userId, dg)
        ]);

    })
    .then(function() {
      return Q.all([
        // Always remove the user from his own suggested contacts
        persistence.SuggestedContact.removeQ({ userId: userId, contactUserId: userId }),
        // Also remove his email address
        userService.findById(userId)
          .then(function(user) {
            var emails = user.getAllEmails();
            return persistence.SuggestedContact.removeQ({ userId: userId, email: { $in: emails } });
          })
        ]);
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

function addEmailAddress(currentUserId, queryText) {
  return function(results) {
    if(results.length === 0 && isValidEmailAddress(queryText)) {
      return userService.findByEmail(queryText)
        .then(function(user) {
          if(user) {
            if(user.id !== currentUserId) {
              return [{
                contactUserId: user.id,
                name: user.displayName,
                username: user.username,
                emails: [queryText],
                knownEmails: [queryText]
              }];

            }
          }

          return [];
        });
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

  if(queryText || !excludeTroupeId && !excludeConnected) {
    if(queryTextSearch) query.find(queryTextSearch);

    return query.execQ()
      .then(addEmailAddress(userId, queryText))
      .then(searchifyResults(skip, limit));
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
         { contactUserId: { $nin: troupeUserIds } }
        ]});
      }

      if(excludeConnected) {
        var connectedUserIds = results.shift();

        terms.push({ $or: [
          { contactUserId: { $exists: false } },
          { contactUserId: { $nin: connectedUserIds } }
        ]});
      }

      query.find({ $and: terms });

      return query.execQ()
        .then(addEmailAddress(userId, queryText))
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

appEvents.localOnly.onContactsUpdated(function(data) {
  var userId = data.userId;
  redisClient_del('sc:' + userId);
});


appEvents.localOnly.onNewInvite(function(data) {
  var fromUserId = data.fromUserId;
  if(fromUserId) redisClient_del('sc:' + fromUserId);

  var toUserId = data.toUserId;
  if(toUserId) redisClient_del('sc:' + toUserId);

});
