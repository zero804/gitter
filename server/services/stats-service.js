/*jslint node: true */
"use strict";

var nconf = require('../utils/config');

if(!nconf.get("stats:sendStats")) {
  /* No-op */
  exports.send = function() {};
  return;
}

var cube = require("cube");
var statsEnvName = nconf.get("stats:envName");

var client = cube.emitter("ws://localhost:1080");


exports.send = function(eventName, data) {
  if(!data) data = {};
  data.env = statsEnvName;
  client.send({
    type: "troupe_" + eventName,
    time: new Date(),
    data: data
  });
};

