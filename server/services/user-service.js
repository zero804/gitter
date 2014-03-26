/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

// var sechash                   = require('sechash');
var winston                   = require('../utils/winston');
var assert                    = require('assert');
var _                         = require('underscore');
var persistence               = require("./persistence-service");
var userConfirmationService   = require('./user-confirmation-service');
var statsService              = require("./stats-service");
var collections               = require("../utils/collections");
var uriLookupService          = require('./uri-lookup-service');

/**
 * Creates a new user
 * @return the promise of a new user
 */
function newUser(options, callback) {
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
    displayName:        options.displayName
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

  return persistence.User.findOneAndUpdateQ(
    { githubId: githubId },
    {
      $setOnInsert: insertFields
    },
    {
      upsert: true
    })
    .then(function(user) {
      // Reserve the URI for the user so that we don't need to figure it out
      // manually later (which will involve dodgy calls to github)
      return uriLookupService.reserveUriForUsername(user._id, user.username)
        .thenResolve(user);
    })
    .then(function(user) {
      var optionStats = options.stats || {};

      statsService.event('new_user', _.extend({
        userId:   user.id,
        username: options.username,
        email:    options.email,
        source:   options.source
      }, optionStats));

      statsService.userUpdate(user, _.extend({
        source: options.source
      }, optionStats));

      return user;
    })
    .nodeify(callback);
}

var userService = {
  findOrCreateUserForGithubId: function(options, callback) {
    winston.info("Locating or creating user", options);

    return userService.findByGithubId(options.githubId)
      .then(function(user) {
        if(user) return user;

        return newUser(options);
      })
      .nodeify(callback);
  },

  findByConfirmationCode: function(confirmationCode, callback) {
    persistence.User.find().or([{confirmationCode: confirmationCode} /*, {'unconfirmedEmails.confirmationCode': confirmationCode} */]).findOne()
      .execQ()
      .nodeify(callback);
  },

  findAndUsePasswordResetCode: function(passwordResetCode, callback) {
    winston.info("Using password reset code", passwordResetCode);
    return persistence.User.findOneQ({ passwordResetCode: passwordResetCode })
    .then(function(user) {
      assert(user, 'User not found');
      user.passwordResetCode = null;
      user.passwordHash = null;
      return user.saveQ().thenResolve(user);
    })
    .then(function(user) {
      if (user.isConfirmed()) {
        return user;
      } else {
        return userConfirmationService.confirmSignup(user);
      }
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
    return persistence.User.findOneQ({username: username.toLowerCase()})
            .nodeify(callback);
  },

  findByIds: function(ids, callback) {
    return persistence.User.where('_id')['in'](collections.idsIn(ids))
      .execQ()
      .nodeify(callback);
  },

  findByUsernames: function(usernames, callback) {
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

  // setUserLocation: function(userId, location, callback) {
  //   statsService.event("location_submission", {
  //     userId: userId
  //   });

  //   userService.findById(userId, function(err, user) {
  //     if(err) return callback(err);
  //     if(!user) return callback(err);

  //     /* Save new history */
  //     new persistence.UserLocationHistory({
  //       userId: user.id,
  //       timestamp: location.timestamp,
  //       coordinate: {
  //           lon:  location.lon,
  //           lat: location.lat
  //       },
  //       speed: location.speed
  //     }).save(function(err) {
  //       if(err) winston.error("User location history save failed: ", err);
  //     });

  //     function persistUserLocation(named) {
  //       function nullIfUndefined(v) { return v ? v : null; }

  //       if(!named) named = {};

  //       user.location.timestamp = location.timestamp;
  //       user.location.coordinate.lon = location.lon;
  //       user.location.coordinate.lat = location.lat;
  //       user.location.speed = location.speed;
  //       user.location.altitude = location.altitude;
  //       user.location.named.place = nullIfUndefined(named.place);
  //       user.location.named.region = nullIfUndefined(named.region);
  //       user.location.named.countryCode = nullIfUndefined(named.countryCode);

  //       user.save(function(err) {
  //         return callback(err, user);
  //       });
  //     }

  //     geocodingService.reverseGeocode( { lat: location.lat, lon: location.lon }, function(err, namedLocation) {
  //       if(err || !namedLocation) {
  //         winston.error("Reverse geocoding failure ", err);
  //         persistUserLocation(null);
  //         return;
  //       } else {
  //         winston.info("User location (" + location.lon + "," + location.lat + ") mapped to " + namedLocation.name);
  //         persistUserLocation({
  //           place: namedLocation.name,
  //           region: namedLocation.region.name,
  //           countryCode: namedLocation.country.code
  //         });
  //       }
  //     });
  //   });
  // },

  deleteAllUsedInvitesForUser: function(user) {
    persistence.Invite.remove({ userId: user.id, status: "USED" });
  },


};

module.exports = userService;
