/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var logout = require('./logout');
var winston = require('../../utils/winston');
var statsService = require('../../services/stats-service');
var oauthService = require('../../services/oauth-service');


module.exports = function(req, res, next) {
  var user = req.user;
  var userId = user && user.id;
  var username = user && user.username;

  winston.warn("logout-destroy-tokens: performing logout", {
    userId: userId,
    username: username
  });

  statsService.event('logout_destroy_user_tokens', { userId: userId, username: username });

  if(req.session) {
    logout(req, res, postLogout);
  } else {
    postLogout();
  }

  function send() {
    // Are we dealing with an API client? Tell em in HTTP
    if(req.accepts(['json','html']) === 'json') {
      winston.error("User no longer has a token");
      res.send(401, { success: false, loginRequired: true });
      return;
    }

    /* Not a web client? Give them the message straightup */
    if(req.headers['authorization']) {
      return next(401);
    }

    return res.relativeRedirect("/");
  }

  function postLogout(err) {
    if(err) winston.warn('Unable to log user out');

    if(!user) return send(req, res, next);

    user.destroyTokens();
    user.save(function(err) {
      if(err) winston.error('Unable to save user: ' + err, { exception: err });

      oauthService.removeAllAccessTokensForUser(userId, function(err) {
        if(err) { winston.error('Unable to remove access tokens: ' + err, { exception: err }); }

        return send(req, res, next);
      });
    });
  }
};
