/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var nconf = require('../utils/config');

module.exports = {
    install: function(app) {
      app.get(
        '/join-us',
        function(req, res) {
          res.render('join-us', { homeUrl: nconf.get('web:homeurl') });
        }
      );
    }
};
