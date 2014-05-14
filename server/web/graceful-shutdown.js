/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var shutdown = require('shutdown');

module.exports = {
  install: function(server, app) {
    var gracefullyClosing = false;
    app.use(function(req, res, next) {
      if(!gracefullyClosing) return next();

      res.setHeader("Connection", "close");
      res.send(502, "Server is in the process of restarting");
    });

    shutdown.addHandler('web', 20, function(callback) {
      gracefullyClosing = true;
      server.close(callback);
    });
  }
};
