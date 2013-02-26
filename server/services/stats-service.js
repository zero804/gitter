/*jshint globalstrict:true, trailing:false unused:true node:true*/
"use strict";

var nconf = require('../utils/config');
var winston = require('../utils/winston');

if(!nconf.get("stats:sendStats")) {
  /* No-op */
  exports.event = function() {};
  return;
}

var cube = require("cube");
var statsEnvName = nconf.get("stats:envName");
var statsUrl = nconf.get("stats:cubeUrl");

// TODO: conf this
var client = cube.emitter(statsUrl);

exports.event = function(eventName, data) {
  if(!data) data = {};
  data.env = statsEnvName;
  var event = {
    type: "troupe_" + eventName,
    time: new Date(),
    data: data
  };

  winston.debug("Stat", event);
  client.send(event);
};

