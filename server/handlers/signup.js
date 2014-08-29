/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var loginUtils = require('../web/login-utils');
var nconf      = require('../utils/config');

module.exports = {
    install: function(app) {
      app.get(nconf.get('web:homeurl'),
        require('../web/middlewares/unawesome-browser'),
        function(req, res, next) {
          if(req.user && req.query.redirect !== 'no') {
            loginUtils.redirectUserToDefaultTroupe(req, res, next);
            return;
          }

          // when the viewer is not logged in:
          res.render('homepage', {
            billingBaseUrl: nconf.get('web:billingBaseUrl')
          });
        });

      if (nconf.get('web:homeurl') !== '/') {
        app.get('/',
          function(req, res) {
            if(req.user) {
              if(req.query.redirect === 'no') {
                res.relativeRedirect(nconf.get('web:homeurl') + '?redirect=no');
              } else {
                res.relativeRedirect(nconf.get('web:homeurl'));
              }
              return;
            }

            res.render('landing');
          });
      }

    }
};
