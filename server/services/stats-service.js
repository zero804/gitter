/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var nconf   = require('../utils/config');
var winston = require('../utils/winston');

var cube_enabled        = nconf.get("stats:cube:enabled")       || false;
var mixpanel_enabled    = nconf.get("stats:mixpanel:enabled")   || false;
var customerio_enabled  = nconf.get("stats:customerio:enabled") || false;

var blacklist = ['location_submission','push_notification','mail_bounce','new_mail_attachment','remailed_email','new_file_version','new_file'];

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
  if (!email) {
    winston.debug("[stats] Didn't receive an email for isTestUser");
    // return true;
  }
  if (email.indexOf("troupetest.local") !== -1) return true; else return false;
}

exports.event = function(eventName, properties) {

  console.log("EVENT: " + eventName + "thing");

  if(!properties) properties = {};

  // Cube
  if (cube_enabled) {
    properties.env = nconf.get("stats:envName");

    var event = {
      type: "troupe_" + eventName,
      time: new Date(),
      data: properties
    };
    cube.send(event);
  }

  if (blacklist.indexOf(eventName) == -1) {
    if (!isTestUser(properties.email)) {
      winston.verbose("[stats]" , "Logging user to Customer Actions: " + properties.email);
      // MixPanel
      if (mixpanel_enabled) {
        properties.distinct_id = properties.userId;
        mixpanel.track(eventName, properties, function(err) { if (err) throw err; });
      }

      // CustomerIO
      if (customerio_enabled) {
        if (!properties.email) console.log("OY OY OY OY OY OY OY OY OY OY DIDNT GET AN EMAIL");
        cio.track(properties.userId, eventName, properties);
      }
    }
  }

  winston.verbose("[stats]", {event: eventName, properties: properties});
};

exports.userUpdate = function(user, properties) {
  if (isTestUser(user.email)) return;

  winston.verbose("[stats] Updating user stat");

  if(!properties) properties = {};

  var createdAt = new Date(user._id.getTimestamp().getTime());
  var firstName = user.displayName ? user.displayName.split(' ')[0] : user.email.split('@')[0];

  if (mixpanel_enabled) {
    var mp_properties = {
      $first_name:  firstName,
      $created_at:  createdAt.toISOString(),
      $email:       user.email,
      $name:        user.displayName,
      $username:    user.username,
      Status:       user.status
    };

    for (var attr in properties) { mp_properties[attr] = properties[attr]; }

    mixpanel.people.set(user.id, mp_properties);
  }

  if (customerio_enabled) {
    var cio_properties = {
      first_name: firstName,
      created_at: createdAt.toISOString(),
      email:      user.email,
      name:       user.displayName,
      username:   user.username,
      status:     user.status
    };

    for (var attr in properties) { cio_properties[attr] = properties[attr]; }

    cio.identify(user.id, user.email, cio_properties);
  }
};
