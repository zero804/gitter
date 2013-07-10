/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var nconf   = require('../utils/config');
var winston = require('../utils/winston');

var cube_enabled        = nconf.get("stats:cube:enabled")       || false;
var mixpanel_enabled    = nconf.get("stats:mixpanel:enabled")   || false;
var customerio_enabled  = nconf.get("stats:customerio:enabled") || false;

if (cube_enabled) {
  var Cube = require("cube");
  var statsUrl = nconf.get("stats:cube:cubeUrl");
  var cube = Cube.emitter(statsUrl);
}

if (mixpanel_enabled) {
  var Mixpanel  = require('mixpanel');
  var token     = nconf.get("stats:mixpanel:token");
  var mixpanel  = Mixpanel.init(token);
  var blacklist = ['location_submission'];
}

if (customerio_enabled) {
  var CustomerIO = require('customer.io');
  var cio = CustomerIO.init(nconf.get("stats:customerio:siteId"), nconf.get("stats:customerio:key"));
}

exports.event = function(eventName, properties) {
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

  // MixPanel
  if (mixpanel_enabled && blacklist.indexOf(eventName) == -1) {
    properties.distinct_id = properties.userId;
    mixpanel.track(eventName, properties, function(err) { if (err) throw err; });
  }

  // CustomerIO
  if (customerio_enabled) {
    cio.track(properties.userId, eventName, properties);
  }

  winston.verbose("[stats]", {event: eventName, properties: properties});
};

exports.userUpdate = function(user, properties) {
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
