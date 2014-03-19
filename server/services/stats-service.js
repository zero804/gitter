/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var nconf   = require('../utils/config');
var winston = require('../utils/winston');


var mixpanelEventBlacklist = {
  location_submission: true,
  push_notification: true,
  mail_bounce: true,
  new_troupe: true,
  new_mail_attachment: true,
  remailed_email: true,
  new_file_version: true,
  new_file: true,
  login_failed: true,
  password_reset_invalid: true,
  password_reset_completed: true,
  invite_reused: true,
  confirmation_reused: true,
};

var statsHandlers = [];

if (nconf.get("stats:cube:enabled")) {
  var Cube = require("cube");
  var statsUrl = nconf.get("stats:cube:cubeUrl");
  var cube = Cube.emitter(statsUrl);

  statsHandlers.push({
    event: function(eventName, properties) {
      properties.env = nconf.get("stats:envName");

      var event = {
        type: "gitter_" + eventName,
        time: new Date(),
        data: properties
      };
      cube.send(event);
    }
  });
}

if (nconf.get("stats:statsd:enabled")) {
  var StatsD = require('node-statsd').StatsD;
  var statsdClient = new StatsD({ prefix: 'gitter.web.' });

  statsdClient.socket.on('error', function(error) {
    return winston.error("Error in statsd socket: " + error, { exception: error });
  });

  statsHandlers.push({
    event: function(eventName) {
      statsdClient.increment(eventName);
    }
  });
}

if (nconf.get("stats:mixpanel:enabled")) {
  var Mixpanel  = require('mixpanel');
  var token     = nconf.get("stats:mixpanel:token");
  var mixpanel  = Mixpanel.init(token);

  statsHandlers.push({
    event: function(eventName, properties) {
      if(mixpanelEventBlacklist[eventName]) return;

      properties.distinct_id = properties.userId;
      mixpanel.track(eventName, properties, function(err) {
        winston.error('Mixpanel error: ' + err, { exception: err });
      });
    },

    userUpdate: function(user, properties) {
      var createdAt = Math.round(user._id.getTimestamp().getTime() / 1000);
      var firstName = user.getFirstName();

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
  });

}

exports.event = function(eventName, properties) {
  if(!properties) properties = {};

  winston.verbose("[stats] event", { event: eventName });

  statsHandlers.forEach(function(handler) {
    try {
      if(handler.event) {
        handler.event.call(null, eventName, properties);
      }

    } catch(err) {
      winston.error('[stats] Error processing event: ' + err, { event: eventName, properties: properties, exception: err });
    }
  });

};

exports.userUpdate = function(user, properties) {
  if(!properties) properties = {};

  winston.verbose("[stats] userUpdate", { user: user });

  statsHandlers.forEach(function(handler) {
    try {
      if(handler.userUpdate) {
        handler.userUpdate.call(null, user, properties);
      }

    } catch(err) {
      winston.error('[stats] Error processing userUpdate: ' + err, { user: user, properties: properties, exception: err });
    }
  });
};
