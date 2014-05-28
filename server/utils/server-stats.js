/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var env      = require('./env');
var logger   = env.logger;
var stats    = env.stats;
var shutdown = require('shutdown');

module.exports = function(prefix, server) {
  var timer = setInterval(function() {
    server.getConnections(function(err, connections) {
      if(err) return logger.error("Unable to enumerate server connections: " + err, { exception: err });
      stats.gaugeHF(prefix + '.connections', connections);
    });
  }, 1000);

  shutdown.addHandler('server-stats', 20, function(callback) {
    clearTimeout(timer);
    callback();
  });


};