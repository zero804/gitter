/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var nconf   = require('../utils/config');
var winston = require('../utils/winston');

var cube_enabled        = nconf.get("stats:cube:enabled")       || false;
var mixpanel_enabled    = nconf.get("stats:mixpanel:enabled")   || false;
var customerio_enabled  = nconf.get("stats:customerio:enabled") || false;

var blacklist = ['location_submission','push_notification','mail_bounce','new_troupe','new_mail_attachment','remailed_email','new_file_version','new_file','login_failed','password_reset_invalid','password_reset_completed','invite_reused','confirmation_reused'];

if (cube_enabled) {
  var Cube = require("cube");
  var statsUrl = nconf.get("stats:cube:cubeUrl");
  var cube = Cube.emitter(statsUrl);
}

if (mixpanel_enabled) {
  var Mixpanel  = require('mixpanel');
  var token     = nconf.get("stats:mixpanel:token");
  var mixpanel  = Mixpanel.init(token);
}

if (customerio_enabled) {
  var CustomerIO = require('customer.io');
  var cio = CustomerIO.init(nconf.get("stats:customerio:siteId"), nconf.get("stats:customerio:key"));
}

function isTestUser(email) {
  return false;
}

exports.event = function(eventName, properties) {

  if(!properties) properties = {};

  winston.verbose("[stats]", {event: eventName, properties: properties});

  try {

    // Cube
    if (cube_enabled) {
      properties.env = nconf.get("stats:envName");

      var event = {
        type: "gitter_" + eventName,
        time: new Date(),
        data: properties
      };
      cube.send(event);
    }

    if (blacklist.indexOf(eventName) == -1) {
      if (!isTestUser(properties.email)) {
        winston.verbose("[stats]" , "Logging user to Customer Actions: " );
        // MixPanel
        if (mixpanel_enabled) {
          properties.distinct_id = properties.userId;
          mixpanel.track(eventName, properties, function(err) { if (err) throw err; });
        }

        // CustomerIO
        if (customerio_enabled) {
          cio.track(properties.userId, eventName, properties);
        }
      }
    }

  } catch(err) {
    winston.error('[stats] Error processing event: ', err, eventName, properties);
  }

};

exports.userUpdate = function(user, properties) {

  winston.verbose("[stats] Updating user stat");

  try {

    if(!properties) properties = {};

    var createdAt = Math.round(user._id.getTimestamp().getTime() / 1000);
    var firstName = user.getFirstName();

    if (mixpanel_enabled) {
      var mp_properties = {
        $first_name:  firstName,
        $created_at:  new Date(createdAt).toISOString(),
        $email:       user.email,
        $name:        user.displayName,
        $username:    user.username,
        $confirmationCode: user.confirmationCode,
        Status:       user.status
      };

      for (var attr in properties) {
        var value = properties[attr] instanceof Date ? properties[attr].toISOString() : properties[attr];
        mp_properties[attr] = value;
      }


      mixpanel.people.set(user.id, mp_properties);
    }

    var email = user.email;

    if (user.email === '' || !user.email) {
      email = "noemail@gitter.im";
    }

    if (customerio_enabled) {
      var cio_properties = {
        first_name: firstName,
        created_at: createdAt,
        email:      email,
        name:       user.displayName,
        username:   user.username,
        confirmationCode: user.confirmationCode,
        status:     user.status
      };

      for (var attr in properties) {
        var value = properties[attr] instanceof Date ? Math.round(properties[attr].getTime() / 1000) : properties[attr];
        cio_properties[attr] = value;
      }

      cio.identify(user.id, email, cio_properties);
    }

  } catch(err) {
    winston.error('[stats] Error processing userUpdate: ', err, properties);
  }

};
