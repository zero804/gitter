"use strict";

var troupeService = require('../../services/troupe-service');
var userService = require('../../services/user-service');
var emailService = require('../../services/email-notification-service');
var env = require('gitter-web-env');
var Promise = require('bluebird');
var StatusError = require('statuserror');
var emailValidator = require('email-validator');
var stats = env.stats;

module.exports = function (req, res, next) {

  var userId = req.body.userId || req.body.userid; // Why no capital I?
  var username = req.body.username;
  var roomId = req.body.roomId || req.body.roomid; // Why no capital I?
  var email = req.body.email;

  userId = userId ? String(userId) : null;
  username = username ? String(username) : null;
  roomId = roomId ? String(roomId) : null;
  email = email ? String(email) : null;

  if(!emailValidator.validate(email)) {
    return next(new StatusError(400, 'Invalid email address'));
  }

  return Promise.all([
      username ? userService.findByUsername(username) : userService.findById(userId),
      troupeService.findById(roomId)
    ])
    .spread(function (user, room) {
      if(!user || !room) throw new StatusError(404);
      user.invitedEmail = email;

      return user.save()
        .then(function() {
          // TODO: remove this XXX
          return emailService.sendManualInvitation(req.user, user, room, email);
        })
        .thenReturn([user, room]);
    })
    .spread(function (user, room) {
      stats.event('manual-invite', { from: req.user.username, to: user.username, room: room.uri });
      res.send({ success: true });
    })
    .catch(next);
};
