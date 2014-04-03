/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var nconf   = require('../utils/config');
var winston = require('../utils/winston');

var statsHandlers = {
  event: [],
  eventHF: [],
  gaugeHF: [],
  userUpdate: [],
  responseTime: []
};

var mixpanelEnabled = nconf.get("stats:mixpanel:enabled");
var statsdEnabled = nconf.get("stats:statsd:enabled");
var cubeEnabled = nconf.get("stats:cube:enabled");


/**
 * cube
 */
if (cubeEnabled) {
  var Cube = require("cube");
  var statsUrl = nconf.get("stats:cube:cubeUrl");
  var cube = Cube.emitter(statsUrl);

  statsHandlers.event.push(function(eventName, properties) {
    if(!properties) properties = {};

    properties.env = nconf.get("stats:envName");

    var event = {
      type: "gitter_" + eventName.replace(/\./g, '_'),
      time: new Date(),
      data: properties
    };
    cube.send(event);
  });

}

/**
 * statsd
 */
if (statsdEnabled) {
  var StatsD = require('node-statsd').StatsD;
  var statsdClient = new StatsD({ prefix: 'gitter.web.' });

  statsdClient.socket.on('error', function(error) {
    return winston.error("Error in statsd socket: " + error, { exception: error });
  });

  statsHandlers.event.push(function(eventName) {
    statsdClient.increment(eventName);
  });

  statsHandlers.eventHF.push(function(eventName) {
    /* Only send to the server one tenth of the time */
    statsdClient.increment(eventName, 1, 0.1);
  });

  statsHandlers.gaugeHF.push(function(gaugeName, value) {
    /* Only send to the server one tenth of the time */
    statsdClient.gauge(gaugeName, value, 0.1);
  });

  statsHandlers.responseTime.push(function(timerName, duration) {
    statsdClient.timing(timerName, duration);
  });
}

/**
 * Mixpanel
 */
if (mixpanelEnabled) {
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

  var Mixpanel  = require('mixpanel');
  var token     = nconf.get("stats:mixpanel:token");
  var mixpanel  = Mixpanel.init(token);

  statsHandlers.event.push(function(eventName, properties) {
    // Don't handle events that don't have a userId
    if(!properties || !properties.userId) return;

    if(mixpanelEventBlacklist[eventName]) return;

    properties.distinct_id = properties.userId;
    mixpanel.track(eventName, properties, function(err) {
      if(err) {
        winston.error('Mixpanel error: ' + err, { exception: err });
      }
    });
  });

  statsHandlers.userUpdate.push(function(user, properties) {
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

    if(properties) {
      for (var attr in properties) {
        var value = properties[attr] instanceof Date ? properties[attr].toISOString() : properties[attr];
        mp_properties[attr] = value;
      }
    }

    mixpanel.people.set(user.id, mp_properties);
  });
}

function makeHandler(handlers) {
  if(!handlers.length) return function() {};

  if(handlers.length === 1) {
    /**
     * Might seem a bit over the top, but these handlers get
     * called a lot, so we should make this code perform if we can
     */
    var handler = handlers[0];
    return function() {
      var args = arguments;

      try {
        handler.apply(null, args);
      } catch(err) {
        winston.error('[stats] Error processing event: ' + err, { exception: err });
      }
    };
  }

  return function() {
    var args = arguments;

    handlers.forEach(function(handler) {
      try {
        handler.apply(null, args);
      } catch(err) {
        winston.error('[stats] Error processing event: ' + err, { exception: err });
      }
    });
  };
}

/* Normal event */
exports.event = makeHandler(statsHandlers.event);

/* High frequency event */
exports.eventHF = makeHandler(statsHandlers.eventHF);

exports.gaugeHF = makeHandler(statsHandlers.gaugeHF);

/* User update event */
exports.userUpdate = makeHandler(statsHandlers.userUpdate);

/* Response time recorder */
exports.responseTime = makeHandler(statsHandlers.responseTime);

