/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var loginUtils = require("../web/login-utils"),
    winston = require("winston"),
    nconf = require('../utils/config'),
    middleware = require('../web/middleware'),
    userService = require('../services/user-service'),
    assert = require('assert'),
    url = require('url'),
    loginUtils = require('../web/login-utils');

module.exports = {
    install: function(app) {
      app.post('/login',
        middleware.authenticate('local', { failureRedirect: '/login' }),
        middleware.generateRememberMeTokenMiddleware,
        function(req, res) {

          // Either send a JSON message or a browser redirect
          function sendUrl(uri) {
            assert(uri, 'Empty URI');

            if(req.accepts(['html', 'json']) === 'json') {
              res.send({
                failed: false,
                redirectTo: uri
              });

              return;
            }

            res.relativeRedirect(uri);
          }

          var troupeUri = req.body.troupeUri;
          winston.info("login: Performing json login", { troupeUri: troupeUri });

          if(troupeUri) return sendUrl("/" + troupeUri);

          if(req.session.returnTo) {
            winston.info("login: Returning user to original URL ", { url: req.session.returnTo });
            return sendUrl(req.session.returnTo);
          }

          // Deal with oauth, in the case that the session has been trashed....
          if(req.body.oauth == 2) {
            var oauthUrl = url.format({ pathname: '/oauth/authorize', query: {
              client_id: req.body.client_id,
              redirect_uri: req.body.redirect_uri,
              response_type: req.body.response_type,
              scope: req.body.scope
            }});

            return sendUrl(oauthUrl);
          }

          loginUtils.whereToNext(req.user, function(err, url) {
            if (err || !url) return sendUrl(nconf.get('web:homeurl'));

            return sendUrl(url);
          });

        });

      app.get('/login', function(req, res) {
        res.render('m.login.hbs', { });
      });

      // This is almost xactly the same as login, except that the
      // form will submit a token to say that this is an oauth login
      // so that we don't need to rely on req.session.returnTo to
      // reengage the oauth process post login. This means that if the
      // session times out for whatever reason we should be safe
      app.get('/oauth/login', function(req, res) {
        res.render('m.login.hbs', { oauth: true, query: req.query });
      });

      app.post('/reset', function(req, res, next) {
        userService.requestPasswordReset(req.body.email, function(err, user) {
          if(err) return next(err);
          if(!user) {
            res.send({ failed: true });
            return;
          }

          res.send({ success: true });
        });
      });

      app.get('/reset/:confirmationCode',
        middleware.authenticate('passwordreset', { failureRedirect: nconf.get('web:homeurl') + '#passwordResetFailed=true' } ),
        function(req, res, next) {
          loginUtils.redirectUserToDefaultTroupe(req, res, next);
        });

    }
};