/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var nconf = require('../utils/config');

/* /apps is reserved on github */
module.exports = {
    install: function(app) {
      app.get(
        '/apps',
        function (req, res) {
          var userAgent = req.headers['user-agent'] || '';
          var compactView = userAgent.indexOf("Mobile/") >= 0;
          res.render('apps', {
            compactView: compactView,
            homeUrl: nconf.get('web:homeurl')
          });
        }
      );
    }
};
