/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var os = require("os");
var nconf = require('../utils/config');

//TODO: remove
module.exports = {
    install: function(app) {
      app.get('/health-check',
        function(req, res) {
          res.send("OK from " + os.hostname() + ":" + nconf.get('PORT'));
        });
    }
};