'use strict';

var getUserAvatarForSize = require('gitter-web-shared/avatars/get-user-avatar-for-size');
var userService = require('../../services/user-service');
var StatusError = require('statuserror');

var DEFAULT_AVATAR_URL = "https://avatars1.githubusercontent.com/u/0";

function resolveAvatarForUsername(req, res, next) {
  var username = req.params.username;
  var size = parseInt(req.query.s, 10) || 60;

  return userService.findByUsername(username)
    .then(function(user) {
      var url;
      if (user) {
        url = getUserAvatarForSize(user, size);
        if (url.indexOf('/api/private/user-avatar/') != -1) {
          // don't keep redirecting back here in a loop..
          url = DEFAULT_AVATAR_URL;
        }
      } else {
        url = DEFAULT_AVATAR_URL;
      }
      res.redirect(url);
    });
}

module.exports = resolveAvatarForUsername;
