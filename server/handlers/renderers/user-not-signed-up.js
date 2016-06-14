"use strict";

var env = require('gitter-web-env');
var nconf = env.config;
var userService = require('../../services/user-service');
var renderMainFrame = require('./main-frame');

/**
 * renderUserNotSignedUp() renders a set template for a 1:1 chat, with an invited user.
 */
function renderUserNotSignedUp(req, res, next) {
  userService.findByUsername(req.params.roomPart1)
    .then(function (user) {
      res.render('chat-invited-template', {
        cssFileName: "styles/router-nli-chat.css", // TODO: this shouldn't be hardcoded as this
        agent: req.headers['user-agent'],
        oneToOneInvited: true,
        invitedUser: user,
        troupeName: user.username,
        shareURL: nconf.get('web:basepath') + '/' + req.user.username,
        avatarUrl: user.gravatarImageUrl
      });
    })
    .catch(next);
}

function renderUserNotSignedUpMainFrame(req, res, next) {
  req.uriContext = {
    uri: req.params.roomPart1
  }
  return renderMainFrame.renderMainFrame(req, res, next, 'chat');
}

module.exports = exports = {
  renderUserNotSignedUp: renderUserNotSignedUp,
  renderUserNotSignedUpMainFrame: renderUserNotSignedUpMainFrame
};
