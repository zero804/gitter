/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var nconf = require('../utils/config');
var middleware = require('../web/middleware');

module.exports = {
    install: function(app) {
      if (nconf.get('web:homeurl') !== '/') {
        app.get(
          '/',
          middleware.grantAccessForRememberMeTokenMiddleware,
          function(req, res) {
            if(req.user) {
              res.relativeRedirect(nconf.get('web:homeurl'));
              return;
            }

            res.render('landing');
          }
        );
      }
    }
};
