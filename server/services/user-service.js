/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence = require("./persistence-service"),
    sechash = require('sechash'),
    emailNotificationService = require("./email-notification-service"),
    uuid = require('node-uuid'),
    geocodingService = require("./geocoding-service"),
    assert = require("assert"),
    winston = require("winston"),
    statsService = require("./stats-service"),
    crypto = require('crypto'),
    _ = require('underscore');

function generateGravatarUrl(email) {
  return  "https://www.gravatar.com/avatar/" + crypto.createHash('md5').update(email).digest('hex') + "?d=identicon";
}

var userService = {
  newUser: function(options, callback) {
    var user = new persistence.User(options);
    user.displayName = options.displayName;
    user.email = options.email;
    user.confirmationCode = uuid.v4();

    user.gravatarImageUrl = generateGravatarUrl(user.email);
    user.status = options.status ? options.status : "UNCONFIRMED";

    user.save(function (err) {
      if(err) { winston.error("User save failed: ", err); }

      return callback(null, user);
    });
  },

  findOrCreateUserForEmail: function(options, callback) {
    winston.info("Locating or creating user", options);

    var displayName = options.displayName;
    var email = options.email;
    var status = options.status;

    persistence.User.findOne({email: email}, function(err, user) {
      if(err) return callback(err);
      if(user) return callback(err, user);

      userService.newUser({
        displayName: displayName,
        email: email,
        status: status
      }, function(err, user) {
        if(err) return callback(err);

        return callback(null, user);
      });

    });

  },

  findByEmail: function(email, callback) {
    persistence.User.findOne({email: email.toLowerCase()}, function(err, user) {
      callback(err, user);
    });
  },

  findByConfirmationCode: function(confirmationCode, callback) {

    persistence.User.findOne({confirmationCode: confirmationCode}, function(err, user) {
      callback(err, user);
    });
  },

  requestPasswordReset: function(email, callback) {
    winston.info("Requesting password reset", email);

    persistence.User.findOne({email: email}, function(err, user) {
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
    persistence.User.findById(id, function(err, user) {
      callback(err, user);
    });
  },

  findByIds: function(ids, callback) {
    ids = _.uniq(ids);
    persistence.User.where('_id').in(ids)
      .slaveOk()
      .exec(callback);
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
      callback(false);
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

    // look up the user
    userService.findById(userId, function(err, user) {
      if(err) return callback(err);
      if(!user) return callback("User not found");

      // generate and save a gravatar image url if they don't already have one
      if (!user.gravatarImageUrl)
        user.gravatarImageUrl = generateGravatarUrl(user.email);

      switch(user.status) {
        case 'PROFILE_NOT_COMPLETED':
          // mark user as active after setting the password
          if(user.passwordHash) {
            return callback("User already has a password set");
          }

          userService.setStatusActive(user);
          // set password and save
          generateNewHash(function() {
            user.save(callback);
          });
          break;

        case 'ACTIVE':
          // check for password change
          if(password) {
            // set new password if the old one is correct
            sechash.testHash(oldPassword, user.passwordHash, function(err, match) {
              if(err) return callback(err);
              if(!match) return callback({authFailure: true });
              generateNewHash(maybeChangeEmailAndSave);
            });
          }
          else {
            // go directly into the change email method
            maybeChangeEmailAndSave();
          }
          break;

        default:
          return callback("Invalid user status");
      }

      // set new properties
      user.displayName = displayName;

      // generates and sets the new password hash
      function generateNewHash(callback) {
        sechash.strongHash('sha512', password, function(err, hash3) {
          if(err) return callback(err);

          user.passwordHash = hash3;

          callback();
        });
      }

      // change email address
      function maybeChangeEmailAndSave() {
        if (email && user.email !== email) {

          // check if this new email is available for use
          userService.findByEmail(email, function(e, existingUser) {
            if (existingUser || e) {
              // shouldn't we still save the other details?
              var err = new Error("The email address you are trying to change to is already registered by someone else.");
              err.emailConflict = true;
              return callback(err);
            }

            // save the new email address while it is being confirmed
            user.newEmail = email;
            // update the confirmation code, which will be sent to the new email address
            user.confirmationCode = uuid.v4();

            user.save(function(e) {
              if (!e) {
                // send change email confirmation to new address
                emailNotificationService.sendConfirmationForEmailChange(user);
              }
              callback(e, user);
            });
          });
        }
        else {
          user.save(callback);
        }
      }

    });
  },

  // this does not save the user object
  setStatusActive: function(user) {

    user.status = 'ACTIVE';

    // delete all used invites now that the user doesn't need them to login

    // note: it would be better if this was only called after the user was saved, but updateProfile async hell at the moment.
    userService.deleteAllUsedInvitesForUser(user);
  },

  deleteAllUsedInvitesForUser: function(user) {
    persistence.Invite.remove({ userId: user.id, status: "USED" });
  }

};

module.exports = userService;