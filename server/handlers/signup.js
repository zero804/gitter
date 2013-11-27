/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var winston                 = require('winston');
var middleware              = require("../web/middleware");
var loginUtils              = require('../web/login-utils');
var nconf                   = require('../utils/config');
var isPhone                 = require('../web/is-phone');

module.exports = {

    install: function(app) {
      app.get('/x', function(req, res, next) {
        winston.warn('/x is only meant for testing, do not use in production. Use web:homeurl instead.');
        var homeurl = nconf.get('web:homeurl');
        if(homeurl === '/x') {
          next();
        } else {
          res.relativeRedirect(homeurl);
        }
      });

      app.get(nconf.get('web:homeurl'),
        middleware.ensureValidBrowser,
        middleware.grantAccessForRememberMeTokenMiddleware,
        function(req, res, next) {

          if(req.user) {
            loginUtils.redirectUserToDefaultTroupe(req, res, next);
            return;
          }

          // when the viewer is not logged in:
          var template = isPhone(req.headers['user-agent']) ? 'mobile/homepage' : 'homepage';
          res.render(template, { profileHasNoUsername: JSON.stringify(false), userId: JSON.stringify(null) });
        }
      );
    }
};
