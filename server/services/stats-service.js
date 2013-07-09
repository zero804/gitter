/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var nconf = require('../utils/config');
var winston = require('../utils/winston');

if(!nconf.get("stats:sendStats")) {
  /* No-op */
  var noop = function() {};
  exports.event = noop;
  exports.userUpdate = noop;
  exports.user = noop;
}
else {

  if (nconf.get("stats:cube:enabled")) {
    var Cube = require("cube");
    var statsEnvName = nconf.get("stats:envName");
    var statsUrl = nconf.get("stats:cubeUrl");
    var cube = Cube.emitter(statsUrl);
  }

  if (nconf.get("stats:mixpanel:enabled")) {
    var Mixpanel  = require('mixpanel');
    var token     = nconf.get("stats:mixpanel:token");
    var mixpanel  = Mixpanel.init(token);
  }

  // FIXME too many IFs find a nicer way
  exports.event = function(eventName, properties) {
    if(!properties) properties = {};
    properties.env = statsEnvName;

    // MixPanel
    if (nconf.get("stats:mixpanel:enabled")) {
      properties.distinct_id = properties.userId;
      mixpanel.track(eventName, properties, function(err) { if (err) throw err; });
    }

    // Cube
    if (nconf.get("stats:cube:enabled")) {
      var event = {
        type: "troupe_" + eventName,
        time: new Date(),
        data: properties
      };
      cube.send(event);
    }

    winston.verbose("[stats]", {event: eventName, properties: properties});
  };

  exports.userUpdate = function(user) {
    var createdAt = new Date(user._id.getTimestamp().getTime());
    var firstName = user.displayName ? user.displayName.split(' ')[0] : user.email.split('@')[0];

    mixpanel.people.set(user.id, {
      $first_name: firstName,
      $created_at: createdAt.toISOString(),
      $email: user.email,
      $name: user.displayName,
      $username: user.username,
      Status: user.status
    });
  };

  exports.setUserProperty = function(userId, key, value) {
    mixpanel.people.set(userId, key, value);
  };
}
