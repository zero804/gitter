"use strict";

var assert                 = require('assert');
var _                      = require('underscore');
var Promise                = require('bluebird');
var githubUserService      = require('gitter-web-github').GitHubUserService;
var persistence            = require("./persistence-service");
var uriLookupService       = require('./uri-lookup-service');
var winston                = require('../utils/winston');
var mongooseUtils          = require('../utils/mongoose-utils');
var extractGravatarVersion = require('../utils/extract-gravatar-version');

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
      //  .thenReturn(user);

      return user;
    })
    .then(function(user) {
      // Reserve the URI for the user so that we don't need to figure it out
      // manually later (which will involve dodgy calls to github)
      return uriLookupService.reserveUriForUsername(user._id, user.username)
        .thenReturn(user);
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
          gravatarImageUrl:   githubUser.avatar_url,
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
    return Promise.map(usernames, function(username) {
        return userService.inviteByUsername(username, user).reflect();
      })
      .then(function(inspections) {
        var invitedUsers = inspections.reduce(function(memo, inspection) {
          if (inspection.isFulfilled()) {
            memo.push(inspection.value());
          }
          return memo;
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


  /**
   * Add the user if one doesn't exist for this identity and set the data for
   * that provider for the user whether the user is new or not.
   * @return promise of [user, isNewIdentity]
   */
  findOrCreateUserForProvider: function(userData, identityData) {
    winston.info("Locating or creating user", {
      userData: userData,
      identityData: identityData
    });

    // This is not for GitHub. Only for newer providers. At least until we
    // finally migrate all the github data one day.
    assert.notEqual(identityData.provider, 'github');

    // TODO: should we assert all the required user and identity fields?

    var userQuery = {
      identities: {
        $elemMatch: {
          provider: identityData.provider,
          providerKey: identityData.providerKey
        }
      }
    };

    var user;
    var isNewUser;
    var userInsertData = _.extend({
      identities: [{
          provider: identityData.provider,
          providerKey: identityData.providerKey
        }]
    }, userData);
    return mongooseUtils.upsert(persistence.User, userQuery, {
        $setOnInsert: userInsertData
      })
      .spread(function(_user, _isNewUser) {
        user = _user;
        isNewUser = _isNewUser;
        var identityQuery = {
          provider: identityData.provider,
          userId: user._id
        };
        var identitySetData = _.extend({
          userId: user._id
        }, identityData);
        return mongooseUtils.upsert(persistence.Identity, identityQuery, {
          // NOTE: set the identity fields regardless, because the tokens and
          // things could be newer than what we have if this is a login and
          // not a signup.
          $set: identitySetData
        });
      })
      .spread(function() {
        return uriLookupService.reserveUriForUsername(user._id, user.username);
      })
      .then(function() {
        return [user, isNewUser];
      });
  },

  findById: function(id, callback) {
    return persistence.User.findById(id)
      .exec()
      .nodeify(callback);
  },

  /**
   * Returns a hash of booleans if the given usernames exist in gitter
   */
  githubUsersExists: function(usernames, callback) {
    return persistence.User.find({ username: { $in: usernames } }, { username: 1, _id: 0 }, { lean: true })
      .exec()
      .then(function(results) {
        return results.reduce(function(memo, index) {
          memo[index.username] = true;
          return memo;
        }, { });
      })
      .nodeify(callback);
  },

  findByGithubId: function(githubId, callback) {
    return persistence.User.findOne({ githubId: githubId })
           .exec()
           .nodeify(callback);
  },

  findByGithubIdOrUsername: function(githubId, username, callback) {
    return persistence.User.findOne({ $or: [{ githubId: githubId }, { username: username } ]})
      .exec()
      .nodeify(callback);
  },

  findByEmail: function(email, callback) {
    return persistence.User.findOne({ $or: [{ email: email.toLowerCase()}, { emails: email.toLowerCase() }]})
            .exec()
            .nodeify(callback);
  },

  findByEmailsIndexed: function(emails, callback) {
    emails = emails.map(function(email) { return email.toLowerCase(); });

    return persistence.User.find({ $or: [
              { email: { $in: emails } },
              { emails: { $in: emails } }
              ]})
      .exec()
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
    return persistence.User.findOne({ 'unconfirmedEmails.email': email.toLowerCase() })
      .exec()
      .nodeify(callback);
  },

  findByUsername: function(username, callback) {
    return persistence.User.findOne({ username: username })
            .exec()
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
      return Promise.resolve([]).nodeify(callback);
    }

    var searchPattern = '^' + sanitiseUserSearchTerm(searchTerm);
    return persistence.User.find({
      _id: { $in: ids },
      $or: [
        { username: { $regex: searchPattern, $options: 'i' } },
        { displayName: { $regex: searchPattern, $options: 'i' } }
      ]
    }).limit(limit)
      .exec()
      .nodeify(callback);
  },

  findByUsernames: function(usernames, callback) {
    if(!usernames || !usernames.length) return Promise.resolve([]).nodeify(callback);

    return persistence.User.where('username')['in'](usernames)
      .exec()
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
    return persistence.User.findOne({ _id: userId }, 'username')
      .exec()
      .then(function(user) {
        return user && user.username;
      });
  },

  deleteAllUsedInvitesForUser: function(user) {
    persistence.Invite.remove({ userId: user.id, status: "USED" });
  },

  destroyTokensForUserId: function(userId) {
    return persistence.User.update({ _id: userId }, { $set: { githubToken: null, githubScopes: { }, githubUserToken: null } })
      .exec();
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

    return persistence.User.update({ _id: userId }, update).exec();
  }

};

module.exports = userService;
