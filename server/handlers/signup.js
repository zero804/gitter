/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var loginUtils = require('../web/login-utils');
var nconf      = require('../utils/config');
var locale     = require("locale");
var social     = require('./social-metadata');
var supported  = new locale.Locales(["en", "ru", "ja"]);

module.exports = {
    install: function(app) {
      app.get(nconf.get('web:homeurl'),
        require('../web/middlewares/unawesome-browser'),
        function(req, res, next) {
          var locales = new locale.Locales([req.query.lang, req.headers["accept-language"]]);

          if(req.user && req.query.redirect !== 'no') {
            loginUtils.redirectUserToDefaultTroupe(req, res, next);
            return;
          }

          var lang = locales.best(supported);
          var template;

          if(lang.language === 'en') {
            template = 'homepage';
          } else {
            template = 'homepage-' + lang.language;
          }

          // when the viewer is not logged in:
          res.render(template, {
            socialMetadata: social.getMetadata(),
            billingBaseUrl: nconf.get('web:billingBaseUrl')
          });
        });

      app.get('/about', function(req, res, next) {
        res.render('about', {
          socialMetadata: social.getMetadata(),
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
