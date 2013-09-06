/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeService = require('../../services/troupe-service');

module.exports = function(req, res, next) {
  var invite = req.body;

  // Null means we're requesting a one-to-one connection
  return troupeService.createInvite(null, {
      fromUser: req.user,
      email: invite.email,
      displayName: invite.displayName,
      userId: invite.userId
    })
    .then(function() {
      res.send(invite);
    })
    .fail(next);


};