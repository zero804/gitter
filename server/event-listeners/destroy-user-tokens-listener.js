"use strict";

var appEvents   = require('gitter-web-appevents');
var userService = require('../services/user-service');

var installed = false;
exports.install = function() {
  if (installed) return;
  installed = true;

  appEvents.onDestroyUserTokens(function(userId) {
    return userService.destroyTokensForUserId(userId);
  });
};
