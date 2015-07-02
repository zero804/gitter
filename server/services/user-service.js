/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

// var sechash                   = require('sechash');
var winston                   = require('../utils/winston');
var assert                    = require('assert');
var persistence               = require("./persistence-service");
var uriLookupService          = require('./uri-lookup-service');
var Q                         = require('q');
var githubUserService         = require('gitter-web-github').GitHubUserService;
var mongooseUtils             = require('../utils/mongoose-utils');
var extractGravatarVersion    = require('../utils/extract-gravatar-version');

/** FIXME: the insert fields should simply extend from options or a key in options.
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
    gravatarVersion:    options.gravatarVersion,
    username:           options.username,
    invitedByUser:      options.invitedByUser,
    invitedToRoom:      options.invitedToRoom,
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
    .spread(function(user/*, updateExisting*/) {
      //if(raw.updatedExisting) return user;

      // New record was inserted
      //return emailAddressService(user)
      //  .then(function(email) {
      //    stats.userUpdate(_.extend({ email: email, mixpanelId : options.mixpanelId }, user.toJSON()));
      //  })
      //  .thenResolve(user);

      return user;
    })
    .then(function(user) {
      // Reserve the URI for the user so that we don't need to figure it out
      // manually later (which will involve dodgy calls to github)
      return uriLookupService.reserveUriForUsername(user._id, user.username)
        .thenResolve(user);
    });
}

function sanitiseUserSearchTerm(term) {
  // remove non username chars
  return term.replace(/[^0-9a-z\-]/ig, '')
    // escape dashes
    .replace(/\-/ig, '\\-');
}

var userService = {

  /**
   * createdInvitedUser() creates an invited user
   *
   * username   String - username used to fetch information from GitHub
   * user       User - user sending the invite
   * roomId     ObjectID - the room to whic the user has been invited to
   * callback   Function - to be called once finished
   */
  createInvitedUser: function(username, user, roomId, callback) {
    var githubUser = new githubUserService(user);

    return githubUser.getUser(username)
      .then(function (githubUser) {

        // this will be used with newUser below, however you must also add the options to newUser?
        var gitterUser = {
          username:           githubUser.login,
          displayName:        githubUser.name || githubUser.login,
          gravatarImageUrl:   githubUser.avatar_url, // TODO: remove, deprecated
          gravatarVersion:    extractGravatarVersion(githubUser.avatar_url),
          githubId:           githubUser.id,
          invitedByUser:      user && user._id,
          invitedToRoom:      roomId,
          state:              'INVITED'
        };

        // this does not actually create a user here, please follow through?!
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
    return mongooseUtils.findByIds(persistence.User, ids, callback);
  },

  findByIdsLean: function(ids, select) {
    return mongooseUtils.findByIdsLean(persistence.User, ids, select);
  },

  findByIdsAndSearchTerm: function(ids, searchTerm, limit, callback) {
    if(!ids || !ids.length || !searchTerm || !searchTerm.length) {
      return Q.resolve([]).nodeify(callback);
    }

    var searchPattern = '^' + sanitiseUserSearchTerm(searchTerm);
    return persistence.User.find({
      _id: { $in: ids },
      $or: [
        { username: { $regex: searchPattern, $options: 'i' } },
        { displayName: { $regex: searchPattern, $options: 'i' } }
      ]
    }).limit(limit)
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

  destroyTokensForUserId: function(userId) {
    return persistence.User.updateQ({ _id: userId }, { $set: { githubToken: null, githubScopes: { }, githubUserToken: null } });
  },

  /* Update the timezone information for a user */
  updateTzInfo: function(userId, timezoneInfo) {
    var update = {};

    function setUnset(key, value) {
      if (value) {
        if (!update.$set) update.$set = {};
        update.$set['tz.' + key] = value;
      } else {
        if (!update.$unset) update.$unset = {};
        update.$unset['tz.' + key] = true;
      }
    }

    setUnset('offset', timezoneInfo.offset);
    setUnset('abbr', timezoneInfo.abbr);
    setUnset('iana', timezoneInfo.iana);

    return persistence.User.updateQ({ _id: userId }, update);
  }

};

module.exports = userService;
