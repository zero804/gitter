/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var loginUtils = require('../web/login-utils');
var nconf      = require('../utils/config');
var social     = require('./social-metadata');
var langs      = require('langs');

module.exports = {
    install: function(app) {
      app.get(nconf.get('web:homeurl'),
        require('../web/middlewares/unawesome-browser'),
        function(req, res, next) {

          if(req.user && req.query.redirect !== 'no') {
            loginUtils.redirectUserToDefaultTroupe(req, res, next);
            return;
          }

          var locale = req.i18n.getLocale();
          var requested = req.headers["accept-language"] || "";
          requested = requested.split(";")[0] || "";
          requested = requested.split(/,\s*/)[0];
          requested = requested.split("-")[0];

          var requestLangCode, requestLangLocalName;
          if (locale !== requested) {
            var requestLang = langs.where("1", requested);
            if (requestLang) {
              requestLangCode = requestLang["1"];
              requestLangLocalName = requestLang.local;
            }
          }

          var translatedBy = req.i18n.__("Translated By");
          if (translatedBy === "Translated By") translatedBy = "";

          // when the viewer is not logged in:
          res.render('homepage', {
            useOptimizely: locale === 'en',
            wordy: locale === 'ru',
            translationRequired: locale !== requested,
            requestLangCode: requestLangCode,
            requestLangLocalName: requestLangLocalName,
            translated: translatedBy,
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

      app.get('/about/teams', function(req, res, next) {
        res.render('teams', {
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
