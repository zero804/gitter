/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var env                       = require('../utils/env');
var stats                     = env.stats;
// var sechash                   = require('sechash');
var winston                   = require('../utils/winston');
var assert                    = require('assert');
var persistence               = require("./persistence-service");
var collections               = require("../utils/collections");
var uriLookupService          = require('./uri-lookup-service');
var Q                         = require('q');
var githubUserService         = require('./github/github-user-service');

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
    .nodeify(callback);
}

var userService = {
  inviteByUsername: function(username, user, callback) {
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
      .then(function(user) {
        stats.event("new_invited_user", {
          userId: user.id,
          method: 'added_to_room',
          username: user.username
        });

        return user;
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

  // setUserLocation: function(userId, location, callback) {
  //   stats.event("location_submission", {
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
