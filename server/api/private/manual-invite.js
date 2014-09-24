/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeService   = require('../../services/troupe-service');
var userService     = require('../../services/user-service');
var emailService    = require('../../services/email-notification-service');
var env             = require('../../utils/env');
var stats           = env.stats;


module.exports =  function(req, res, next) {
  var userId = req.body.userid;
  var roomId = req.body.roomid;
  var email  = req.body.email;

  userService.findById(userId)
  .then(function(user) {
    user.invitedEmail = email;
    return user.saveQ();
  })
  .then(function(user) {
    return [user[0], troupeService.findById(roomId)];
  })
  .spread(function(user, room) {
    return [user, room, emailService.sendInvitation(req.user, user, room)];
  })
  .spread(function(user, room /*, invitation*/) {
    stats.event('manual-invite', {from: req.user.username, to: user.username, room: room.uri});
    res.send({});
  })
  .fail(next);

};
