/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

// var sechash                   = require('sechash');
var uuid                      = require('node-uuid');
var winston                   = require("winston");
var assert                    = require('assert');
var Q                         = require('q');
var moment                    = require('moment');
var _                         = require('underscore');
var persistence               = require("./persistence-service");
var emailNotificationService  = require("./email-notification-service");
var userConfirmationService   = require('./user-confirmation-service');
// var geocodingService          = require("./geocoding-service");
var statsService              = require("./stats-service");
// var uriLookupService          = require("./uri-lookup-service");
var appEvents                 = require("../app-events");
var collections               = require("../utils/collections");
// var promiseUtils              = require('../utils/promise-utils');

/**
 * Creates a new user
 * @return the promise of a new user
 */
function newUser(options, callback) {
  var githubId = options.githubId;

  assert(githubId, 'githubId required');
  assert(options.githubToken, 'githubToken required');
  assert(options.username, 'username required');
  var email   = options.email ? options.email.toLowerCase() : null;

  var insertFields = {
    githubId:           githubId, 
    githubToken:        options.githubToken,
    username:           options.username,
    email:              email,
    displayName:        options.displayName,
    googleRefreshToken: options.googleRefreshToken || undefined
  };

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
  // findOrCreateUserForEmail: function(options, callback) {
  //   winston.info("Locating or creating user", options);

  //   var email = options.email.toLowerCase();

  //   return userService.findByEmail(email)
  //     .then(function(user) {
  //       if(user) return user;

  //       return newUser(options);
  //     })
  //     .nodeify(callback);
  // },

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

  requestPasswordReset: function(login, callback) {
    winston.info("Requesting password reset for ", login);
    return userService.findByLogin(login)
    .then(function(user) {
      assert(user, 'User not found');
      if(user.passwordResetCode) {
        /* Resend the password reset code to the user */
      } else {
        user.passwordResetCode = uuid.v4();
        return user.saveQ().thenResolve(user);
      }
    })
    .then(function(user) {
      emailNotificationService.sendPasswordResetForUser(user);
      return user;
    })
    .nodeify(callback);
  },

  findAndUsePasswordResetCode: function(passwordResetCode, callback) {
    winston.info("Using password reset code", passwordResetCode);
    return persistence.User.findOneQ({passwordResetCode: passwordResetCode})
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

  findByGithubId: function(githubId, callback) {
    return persistence.User.findOneQ({githubId: githubId})
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

  /**
   * Update the last visited troupe for the user, sending out appropriate events
   * Returns a promise of nothing
   */
  saveLastVisitedTroupeforUserId: function(userId, troupeId, callback) {
    winston.verbose("Saving last visited Troupe for user: " + userId+ " to troupe " + troupeId);

    var lastAccessTime = new Date();

    var setOp = {};
    setOp['troupes.' + troupeId] = lastAccessTime;

    return Q.all([
        // Update UserTroupeLastAccess
        persistence.UserTroupeLastAccess.updateQ(
           { userId: userId },
           { $set: setOp },
           { upsert: true }),
        // Update User
        persistence.User.updateQ({ _id: userId }, { $set: { lastTroupe: troupeId }})
      ])
      .then(function() {
        // XXX: lastAccessTime should be a date but for some bizarre reason it's not
        // serializing properly
        appEvents.dataChange2('/user/' + userId + '/troupes', 'patch', { id: troupeId, lastAccessTime: moment(lastAccessTime).toISOString() });
      })
      .nodeify(callback);

  },

  /**
   * Get the last access times for a user
   * @return promise of a hash of { troupeId1: accessDate, troupeId2: accessDate ... }
   */
  getTroupeLastAccessTimesForUser: function(userId, callback) {
    return persistence.UserTroupeLastAccess.findOneQ({ userId: userId }).then(function(userTroupeLastAccess) {
      if(!userTroupeLastAccess || !userTroupeLastAccess.troupes) return {};

      return userTroupeLastAccess.troupes;
    }).nodeify(callback);
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

  // updateInitialPassword: function(userId, password, callback) {
  //   winston.info("Initial password reset", userId);

  //   persistence.User.findById(userId, function(err, user) {
  //     if(user.passwordHash) return callback("User already has a password set");

  //      sechash.strongHash('sha512', password, function(err, hash3) {
  //        user.passwordHash = hash3;
  //        return callback(false);
  //      });
  //   });
  // },

  // checkPassword: function(user, password, callback) {
  //   if(!user.passwordHash) {
  //     /* User has not yet set their password */
  //     return callback(false);
  //   }

  //   sechash.testHash(password, user.passwordHash, function(err, match) {
  //     if(err) return callback(false);
  //     callback(match);
  //   });
  // },

  // updateProfile: function(options, callback) {
  //   winston.info("User profile update", options.userId);
  //   var userId = options.userId;
  //   var password = options.password;
  //   var oldPassword = options.oldPassword;
  //   var displayName = options.displayName;
  //   var username = options.username;

  //   assert(userId, 'userId expected');

  //   var postSave = [];

  //   var seq = userService.findById(userId)
  //     .then(promiseUtils.required)
  //     .then(queueDeleteInvites);

  //   if(displayName) seq = seq.then(updateDisplayName);
  //   if(password) seq = seq.then(updatePassword);
  //   if(username) seq = seq.then(updateUsername);

  //   return seq.then(saveUser)
  //           .then(performPostSaveActions)
  //           .then(notifyTrackers)
  //           .nodeify(callback);

  //   function queueDeleteInvites(user) {
  //     postSave.push(function() {
  //       userService.deleteAllUsedInvitesForUser(user);
  //     });

  //     return user;
  //   }

  //   function updateDisplayName(user) {
  //     // set new properties
  //     user.displayName = displayName;
  //     return user;
  //   }

  //   function updatePassword(user) {
  //     switch(user.status) {
  //       case 'PROFILE_NOT_COMPLETED':
  //         return hashAndUpdatePassword();

  //       case 'ACTIVE':
  //         return testExistingPassword()
  //             .then(hashAndUpdatePassword);

  //       default:
  //         throw "Invalid user status: " + user.status;
  //     }


  //     // generates and sets the new password hash
  //     function hashAndUpdatePassword() {
  //       return Q.nfcall(sechash.strongHash, 'sha512', password)
  //         .then(function(hash3) {
  //           user.passwordHash = hash3;
  //           // mark user as active after setting the password
  //           if (user.status === 'PROFILE_NOT_COMPLETED' || user.status === 'UNCONFIRMED') {
  //             user.status = "ACTIVE";

  //             postSave.push(function() {
  //               appEvents.userAccountActivated(user.id);
  //               statsService.event('profile_completed', { userId: user.id, email: user.email });
  //             });
  //           }
  //           return user;
  //         });
  //     }

  //     function testExistingPassword() {
  //       if(user.passwordHash) {
  //         return Q.nfcall(sechash.testHash, oldPassword, user.passwordHash)
  //           .then(function(match) {
  //             if(!match && user.passwordHash) throw {authFailure: true };
  //             return user;
  //           });
  //       } else {
  //         return Q.fcall(function() {
  //           return user;
  //         });
  //       }
  //     }

  //   }

  //   function updateUsername(user) {
  //     username = username.toLowerCase();

  //     if(user.username === username) {
  //       // Nothing to do, the user has not changed their email username
  //       return user;
  //     }

  //     return uriLookupService.updateUsernameForUserId(user.id, user.username, username)
  //       .then(function() {
  //         // save the new email address while it is being confirmed
  //         user.username = username;

  //         return user;
  //       })
  //       .fail(function(err) {
  //         if(err === 409) throw { usernameConflict: true };

  //         throw err;
  //       });

  //   }

  //   function saveUser(user) {
  //     return user.saveQ().then(function() {
  //       return user;
  //     });
  //   }

  //   function performPostSaveActions(user) {
  //     postSave.forEach(function(f) { f(); });
  //     return user;
  //   }

  //   function notifyTrackers(user) {
  //     statsService.userUpdate(user);
  //     statsService.event('profile_updated', { userId: user.id, email: user.email });

  //     return user;
  //   }

  // },

  deleteAllUsedInvitesForUser: function(user) {
    persistence.Invite.remove({ userId: user.id, status: "USED" });
  },

  // addSecondaryEmail: function(user, email, silent) {
  //   winston.verbose("Adding secondary email ", email, " for user ", user.id);
  //   return persistence.User.findOneQ({ $or: [{ email: email }, { emails: email } ]})
  //     .then(function(existing) {
  //       if(existing) throw 409; // conflict

  //       var secondary = {
  //         email: email,
  //         confirmationCode: uuid.v4()
  //       };

  //       user.unconfirmedEmails.push(secondary);

  //       if (!silent) {
  //         emailNotificationService.sendConfirmationForSecondaryEmail(secondary);
  //       }

  //       return user.saveQ().thenResolve(user);

  //     });
  // },

  // switchPrimaryEmail: function(user, email) {
  //   assert(user.isConfirmed(), 'User must be confirmed');

  //   var index = user.emails.indexOf(email);
  //   if(index < 0) return Q.reject(404);
  //   user.emails.splice(index, 1, user.email);

  //   user.email = email;
  //   return user.saveQ().thenResolve(user);
  // },

  // removeSecondaryEmail: function(user, email) {
  //   var index = user.emails.indexOf(email);
  //   if(index >= 0) {
  //     user.emails.splice(index, 1);
  //     return user.saveQ().thenResolve(user);
  //   }

  //   var unconfirmed = user.unconfirmedEmails.filter(function(unconfirmedEmail) {
  //     return unconfirmedEmail.email === email;
  //   }).shift();

  //   if(unconfirmed) {
  //     unconfirmed.remove();
  //     return user.saveQ().thenResolve(user);
  //   }

  //   return Q.reject(404);
  // },

  // confirmSecondaryEmail: function(user, confirmationCode) {
  //   return userService.confirmSecondaryEmailByCode(user, confirmationCode);
  // },

  // confirmSecondaryEmailByCode: function(user, confirmationCode) {
  //   var unconfirmed = user.unconfirmedEmails.filter(function(unconfirmedEmail) {
  //     return unconfirmedEmail.confirmationCode === confirmationCode;
  //   }).shift();

  //   return userService.confirmSecondaryUnconfirmed(user, unconfirmed);
  // },

  // confirmSecondaryEmailByAddress: function(user, email) {
  //   var unconfirmed = user.unconfirmedEmails.filter(function(unconfirmedEmail) {
  //     return unconfirmedEmail.email === email;
  //   }).shift();

  //   return userService.confirmSecondaryUnconfirmed(user, unconfirmed);
  // },

  // // private
  // confirmSecondaryUnconfirmed: function(user, unconfirmed) {
  //   if(!unconfirmed) return Q.reject(404);
  //   winston.info("Confirming secondary email ", { userId: user.id, email: unconfirmed.email });

  //   unconfirmed.remove();
  //   var email = unconfirmed.email;

  //   user.emails.push(email);

  //   return user.saveQ()
  //     .then(function() {

  //       // Signal that an email address has been confirmed
  //       appEvents.emailConfirmed(email, user.id);

  //       // Remove the unconfirmed secondary email address for
  //       // any other users who may have tried to register it
  //       return persistence.User.updateQ(
  //         { 'unconfirmedEmails.email': email },
  //         { $pull: { unconfirmedEmails: { email: email } } },
  //         { multi: true });
  //     })
  //     .thenResolve(user);
  // }

};

module.exports = userService;
