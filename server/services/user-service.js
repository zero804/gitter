/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var env                       = require('../utils/env');
var stats                     = env.stats;
var _                         = require('underscore');
// var sechash                   = require('sechash');
var winston                   = require('../utils/winston');
var assert                    = require('assert');
var persistence               = require("./persistence-service");
var collections               = require("../utils/collections");
var uriLookupService          = require('./uri-lookup-service');
var Q                         = require('q');
var githubUserService         = require('./github/github-user-service');
var emailAddressService       = require('./email-address-service');
var mongooseUtils             = require('../utils/mongoose-utils');

/**
 * Creates a new user
 * @return the promise of a new user
 */
function newUser(options) {
  var githubId = options.githubId;

  assert(githubId, 'githubId required');
  assert(options.username, 'username required');

  var insertFields = {
    githubId:           githubId,
    githubUserToken:    options.githubUserToken,
    githubToken:        options.githubToken,
    githubScopes:       options.githubScopes,
    gravatarImageUrl:   options.gravatarImageUrl,
    username:           options.username,
    displayName:        options.displayName,
    state:              options.state
  };

  if (options.emails && options.emails.length) {
    insertFields.emails = options.emails;
  }

  // Remove undefined fields
  Object.keys(insertFields).forEach(function(k) {
    if(insertFields[k] === undefined) {
      delete insertFields[k];
    }
  });

  return mongooseUtils.upsert(persistence.User, { githubId: githubId }, {
      $setOnInsert: insertFields
    })
    .spread(function(user, numAffected, raw) {
      if(raw.updatedExisting) return user;

      // New record was inserted
      return emailAddressService(user)
        .then(function(email) {
          stats.userUpdate(_.extend({ email: email, mixpanelId : options.mixpanelId }, user.toJSON()));
        })
        .thenResolve(user);

    })
    .then(function(user) {
      // Reserve the URI for the user so that we don't need to figure it out
      // manually later (which will involve dodgy calls to github)
      return uriLookupService.reserveUriForUsername(user._id, user.username)
        .thenResolve(user);
    });
}

var userService = {
  createInvitedUser: function(username, user, callback) {
    var githubUser = new githubUserService(user);

    return githubUser.getUser(username)
      .then(function (githubUser) {

        var gitterUser = {
          username:           githubUser.login,
          displayName:        githubUser.name || githubUser.login,
          gravatarImageUrl:   githubUser.avatar_url,
          githubId:           githubUser.id,
          state:              'INVITED'
        };

        return newUser(gitterUser);
      })
      .nodeify(callback);
  },

  inviteByUsernames: function(usernames, user, callback) {
    var promises = usernames.map(function(username) {
      return userService.inviteByUsername(username, user);
    });

    return Q.allSettled(promises)
    .then(function (results) {
      var invitedUsers = results.reduce(function (accum, result) {
        if (result.state === "fulfilled") accum.push(result.value);
        return accum;
      }, []);

      return invitedUsers;
    })
    .nodeify(callback);
  },

  findOrCreateUserForGithubId: function(options, callback) {
    winston.info("Locating or creating user", options);

    return userService.findByGithubId(options.githubId)
      .then(function(user) {
        if(user) return user;

        return newUser(options);
      })
      .nodeify(callback);
  },

  findById: function(id, callback) {
    return persistence.User.findByIdQ(id).nodeify(callback);
  },

  githubUserExists: function(username, callback) {
    return persistence.User.countQ({ username: username })
      .then(function(count) {
        return !!count;
      })
      .nodeify(callback);
  },

  getUserState: function(username, callback) {
    return persistence.User.findOneQ({ username: username })
      .then(function (user) { return user.state; })
      .nodeify(callback);
  },

  /**
   * Returns a hash of booleans if the given usernames exist in gitter
   */
  githubUsersExists: function(usernames, callback) {
    return persistence.User.findQ({ username: { $in: usernames } }, { username: 1, _id: 0 }, { lean: true })
      .then(function(results) {
        return results.reduce(function(memo, index) {
          memo[index.username] = true;
          return memo;
        }, { });
      })
      .nodeify(callback);
  },

  findByGithubId: function(githubId, callback) {
    return persistence.User.findOneQ({ githubId: githubId })
           .nodeify(callback);
  },

  findByGithubIdOrUsername: function(githubId, username, callback) {
    return persistence.User.findOneQ({$or: [{ githubId: githubId }, { username: username }]})
           .nodeify(callback);
  },

  findByEmail: function(email, callback) {
    return persistence.User.findOneQ({ $or: [{ email: email.toLowerCase()}, { emails: email.toLowerCase() }]})
            .nodeify(callback);
  },

  findByEmailsIndexed: function(emails, callback) {
    emails = emails.map(function(email) { return email.toLowerCase(); });

    return persistence.User.findQ({ $or: [
              { email: { $in: emails } },
              { emails: { $in: emails } }
              ]})
      .then(function(users) {

        return users.reduce(function(memo, user) {
          memo[user.email] = user;

          user.emails.forEach(function(email) {
            memo[email] = user;
          });

          return memo;
        }, {});
      })
      .nodeify(callback);
  },

  findByUnconfirmedEmail: function(email, callback) {
    return persistence.User.findOneQ({ 'unconfirmedEmails.email': email.toLowerCase() })
      .nodeify(callback);
  },

  findByUsername: function(username, callback) {
    return persistence.User.findOneQ({username: username})
            .nodeify(callback);
  },

  findByIds: function(ids, callback) {
    if(!ids || !ids.length) return Q.resolve([]).nodeify(callback);

    return persistence.User.where('_id')['in'](collections.idsIn(ids))
      .execQ()
      .nodeify(callback);
  },

  findByUsernames: function(usernames, callback) {
    if(!usernames || !usernames.length) return Q.resolve([]).nodeify(callback);

    return persistence.User.where('username')['in'](usernames)
      .execQ()
      .nodeify(callback);
  },

  findByLogin: function(login, callback) {
    var byEmail = login.indexOf('@') >= 0;
    var find = byEmail ? userService.findByEmail(login)
                       : userService.findByUsername(login);

    return find
      .then(function(user) {
        return user;
      }).nodeify(callback);
  },

  /**
   * Find the username of a single user
   * @return promise of a username or undefined if user or username does not exist
   */
  findUsernameForUserId: function(userId) {
    return persistence.User.findOneQ({ _id: userId }, 'username')
      .then(function(user) {
        return user && user.username;
      });
  },

  deleteAllUsedInvitesForUser: function(user) {
    persistence.Invite.remove({ userId: user.id, status: "USED" });
  },


};

module.exports = userService;
