/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var nconf = require('../utils/config');

module.exports = {
    install: function(app) {
      app.get(
        '/mac-app',
        function(req, res) {
          res.render('mac-app', { homeUrl: nconf.get('web:homeurl') });
        }
      );
    }
};
