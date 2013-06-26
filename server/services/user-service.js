/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence = require("./persistence-service"),
    sechash = require('sechash'),
    emailNotificationService = require("./email-notification-service"),
    uuid = require('node-uuid'),
    geocodingService = require("./geocoding-service"),
    winston = require("winston"),
    statsService = require("./stats-service"),
    crypto = require('crypto'),
    assert = require('assert'),
    collections = require("../utils/collections"),
    Q = require('q');

function generateGravatarUrl(email) {
  var url =  "https://www.gravatar.com/avatar/" + crypto.createHash('md5').update(email).digest('hex') + "?d=identicon";

  winston.verbose('Gravatar URL ' + url);

  return url;
}

var userService = {
  newUser: function(options, callback) {
    assert(options.email, 'Email atttribute required');

    return persistence.User.createQ({
      displayName:      options.displayName,
      email:            options.email,
      confirmationCode: uuid.v4(),
      gravatarImageUrl: generateGravatarUrl(options.email),
      status:           options.status || "UNCONFIRMED"
    }).nodeify(callback);
  },

  findOrCreateUserForEmail: function(options, callback) {
    winston.info("Locating or creating user", options);

    var email = options.email;

    return persistence.User.findOneQ({email: email})
      .then(function(user) {
        if(user) return user;

        return userService.newUser(options);

      })
      .nodeify(callback);
  },


  findByConfirmationCode: function(confirmationCode, callback) {

    persistence.User.findOne({confirmationCode: confirmationCode}, function(err, user) {
      callback(err, user);
    });
  },

  requestPasswordReset: function(login, callback) {
    winston.info("Requesting password reset for ", login);

    userService.findByLogin(login, function(err, user) {
      if(err || !user) return callback(err, user);

      if(user.passwordResetCode) {
        /* Resend the password reset code to the user */
      } else {
        user.passwordResetCode = uuid.v4();
        user.save(); // Async save
      }

      emailNotificationService.sendPasswordResetForUser(user);
      callback(err, user);
    });
  },

  findAndUsePasswordResetCode: function(passwordResetCode, callback) {
    winston.info("Using password reset code", passwordResetCode);

    persistence.User.findOne({passwordResetCode: passwordResetCode}, function(err, user) {
      if(err || !user) return callback(err, user);

      user.passwordResetCode = null;
      user.status = 'PROFILE_NOT_COMPLETED';
      user.passwordHash = null;
      user.save(function(err) {
        if(err) return callback(err);
        callback(err, user);
      });
    });
  },

  findById: function(id, callback) {
    return persistence.User.findByIdQ(id).nodeify(callback);
  },

  findByEmail: function(email, callback) {
    return persistence.User.findOneQ({email: email.toLowerCase()})
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

    if (login.indexOf('@') >= 0) { // login is an email
      statsService.event("login_by_username");
      return userService.findByEmail(login, callback);
    } else { // login is a username
      statsService.event("login_by_email");
      return userService.findByUsername(login, callback);
    }

  },

  saveLastVisitedTroupeforUser: function(userId, troupe, callback) {
    winston.verbose("Saving last visited Troupe for user: ", userId);
    userService.findById(userId, function(err, user) {
      if(err) return callback(err);
      if(!user) return callback("User not found");

      var troupeId = troupe.id;

      var setOp = {};
      setOp['troupes.' + troupeId] = new Date();

      // Update the model, don't wait for a callback
      persistence.UserTroupeLastAccess.update(
        { userId: userId },
        { $set: setOp },
        { upsert: true },
        function(err) {
          if(err) {
            winston.error('Error updating usertroupelastaccess: ' + err, { exception: err });
          }
        });

      // Don't save the last troupe for one-to-one troupes
      if(troupe.oneToOne) {
        return callback();
      }

      if (user.lastTroupe !== troupeId) {
        user.lastTroupe = troupeId;
        user.save(function(err) {
          callback(err);
        });
      } else {
        callback();
      }
    });
  },

  getTroupeLastAccessTimesForUser: function(userId, callback) {
    persistence.UserTroupeLastAccess.findOne({ userId: userId }, function(err, userTroupeLastAccess) {
      if(err) return callback(err);

      if(!userTroupeLastAccess || !userTroupeLastAccess.troupes) return callback(null, {});

      callback(null, userTroupeLastAccess.troupes);
    });

  },

  setUserLocation: function(userId, location, callback) {
    statsService.event("location_submission", {
      userId: userId
    });

    userService.findById(userId, function(err, user) {
      if(err) return callback(err);
      if(!user) return callback(err);

      /* Save new history */
      new persistence.UserLocationHistory({
        userId: user.id,
        timestamp: location.timestamp,
        coordinate: {
            lon:  location.lon,
            lat: location.lat
        },
        speed: location.speed
      }).save(function(err) {
        if(err) winston.error("User location history save failed: ", err);
      });

      function persistUserLocation(named) {
        function nullIfUndefined(v) { return v ? v : null; }

        if(!named) named = {};

        user.location.timestamp = location.timestamp;
        user.location.coordinate.lon = location.lon;
        user.location.coordinate.lat = location.lat;
        user.location.speed = location.speed;
        user.location.altitude = location.altitude;
        user.location.named.place = nullIfUndefined(named.place);
        user.location.named.region = nullIfUndefined(named.region);
        user.location.named.countryCode = nullIfUndefined(named.countryCode);

        user.save(function(err) {
          return callback(err, user);
        });
      }

      geocodingService.reverseGeocode( { lat: location.lat, lon: location.lon }, function(err, namedLocation) {
        if(err || !namedLocation) {
          winston.error("Reverse geocoding failure ", err);
          persistUserLocation(null);
          return;
        } else {
          winston.info("User location (" + location.lon + "," + location.lat + ") mapped to " + namedLocation.name);
          persistUserLocation({
            place: namedLocation.name,
            region: namedLocation.region.name,
            countryCode: namedLocation.country.code
          });
        }
      });
    });
  },

  getUserToken: function(userId, callback) {
    userService.findById(userId, function(err, user) {
      if(err) return callback(err);
      if(!user) return callback(err);

      if(user.userToken) {
        return callback(err, user.userToken);
      }

      // TODO: serious revamp of this security. This is not safe.
      var userToken = uuid.v4();
      user.userToken = userToken;
      user.save(); // Async is fine
      callback(err, userToken);
    });
  },

  updateInitialPassword: function(userId, password, callback) {
    winston.info("Initial password reset", userId);

    persistence.User.findById(userId, function(err, user) {
      if(user.passwordHash) return callback("User already has a password set");

       sechash.strongHash('sha512', password, function(err, hash3) {
         user.passwordHash = hash3;
         return callback(false);
       });
    });
  },

  checkPassword: function(user, password, callback) {
    if(!user.passwordHash) {
      /* User has not yet set their password */
      return callback(false);
    }

    sechash.testHash(password, user.passwordHash, function(err, match) {
      if(err) return callback(false);
      callback(match);
    });
  },

  updateProfile: function(options, callback) {
    winston.info("User profile update", options.userId);
    var userId = options.userId;
    var password = options.password;
    var oldPassword = options.oldPassword;
    var displayName = options.displayName;
    var email = options.email;
    var username = options.username;

    var postSave = [];

    var seq = userService.findById(userId)
      .then(queueDeleteInvites);

    if(displayName) seq = seq.then(updateDisplayName);
    if(password) seq = seq.then(updatePassword);
    if(email) seq = seq.then(updateEmail);
    if(username) seq = seq.then(updateUsername);

    return seq.then(saveUser)
            .then(performPostSaveActions)
            .nodeify(callback);

    function queueDeleteInvites(user) {
      postSave.push(function() {
        userService.deleteAllUsedInvitesForUser(user);
      });

      return user;
    }

    function updateDisplayName(user) {
      // set new properties
      user.displayName = displayName;
      return user;
    }

    function updatePassword(user) {
      switch(user.status) {
        case 'PROFILE_NOT_COMPLETED':
          return hashAndUpdatePassword(password);

        case 'ACTIVE':
          return testExistingPassword()
              .then(hashAndUpdatePassword);

        default:
          throw "Invalid user status";
      }


      // generates and sets the new password hash
      function hashAndUpdatePassword(password) {
        return Q.nfcall(sechash.strongHash, 'sha512', password)
          .then(function(hash3) {
            user.passwordHash = hash3;
            // mark user as active after setting the password
            if (user.status === 'PROFILE_NOT_COMPLETED' || user.status === 'UNCONFIRMED') {
              user.status = "ACTIVE";
            }
            return user;
          });
      }

      // generates and sets the new password hash
      function testExistingPassword() {
        return Q.nfcall(sechash.testHash, oldPassword, user.passwordHash)
          .then(function(match) {
            if(!match) throw {authFailure: true };
            return user;
          });
      }

    }

    function updateEmail(user) {
      email = email.toLowerCase();

      if(user.email === email) {
        // Nothing to do, the user has not changed their email address
        return user;
      }

      user.gravatarImageUrl = generateGravatarUrl(email);


      return userService.findByEmail(email)
        .then(function(existingUser) {
          if(existingUser) {
            throw { emailConflict: true };
          }

          // save the new email address while it is being confirmed
          user.newEmail = email;

          // update the confirmation code, which will be sent to the new email address
          user.confirmationCode = uuid.v4();

          postSave.push(function() {
            emailNotificationService.sendConfirmationForEmailChange(user);
          });
          return user;
        });
    }

    function updateUsername(user) {
      username = username.toLowerCase();

      if(user.username === username) {
        // Nothing to do, the user has not changed their email username
        return user;
      }

      return userService.findByUsername(username)
        .then(function(existingUser) {
          if(existingUser) {
            throw { usernameConflict: true };
          }

          // save the new email address while it is being confirmed
          user.username = username;

          return user;
        });
    }

    function saveUser(user) {
      return user.saveQ().then(function() {
        return user;
      });
    }

    function performPostSaveActions(user) {
      postSave.forEach(function(f) { f(); });
      return user;
    }

  },

  /* UNCONFIRMED -> PROFILE_NOT_COMPLETE (fails isProfilePassworded or isProfileUsernamed) -> ACTIVE */
  isProfileConfirmed: function(user) {
    return user.status !== "UNCONFIRMED";
  },

  isProfileNotComplete: function(user) {
    return user.status === "PROFILE_NOT_COMPLETED";
  },

  isProfilePassworded: function(user) {
    return !!user.passwordHash;
  },

  isProfileUsernamed: function(user) {
    return !!user.username;
  },

  isProfileComplete: function(user) {
    return user.status === "ACTIVE" && userService.isProfileUsernamed(user);
  },

  isProfileActive: function(user) {
    return userService.isProfileComplete(user); // alias for now, but deleting an account might introduce "complete but not active"
  },

  deleteAllUsedInvitesForUser: function(user) {
    persistence.Invite.remove({ userId: user.id, status: "USED" });
  },

  findTakenUsernames: function(usernames, callback) {
    persistence.User
      .where('username')['in'](usernames)
      .select('username')
      .exec(function(err, users) {
        var result = {};
        users.forEach(function(user) {
          this[user.username] = true;
        }, result);

        return callback(null, result);
      });

  }

};

module.exports = userService;