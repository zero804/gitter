/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeService = require('../../services/troupe-service');
var Q = require('q');

module.exports = function(req, res, next) {
  var invites = req.body;

  var promises = invites.map(function(invite) {

    // Null means we're requesting a one-to-one connection
    return troupeService.createInvite(null, {
        fromUser: req.user,
        email: invite.email,
        displayName: invite.displayName,
        userId: invite.userId
      });
  });

  Q.all(promises).then(function() {
    res.send(invites);
  }, next);


};