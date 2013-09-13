/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeService     = require('../../services/troupe-service');
var restSerializer    = require("../../serializers/rest-serializer");

module.exports = function(req, res, next) {
  var invite = req.body;

  // Null means we're requesting a one-to-one connection
  return troupeService.createInvite(null, {
      fromUser: req.user,
      email: invite.email,
      displayName: invite.displayName,
      userId: invite.userId
    })
    .then(function(result) {
      if(result.ignored) return res.send(result);

      var strategy = new restSerializer.InviteStrategy({ currentUserId: req.user.id });
      restSerializer.serialize(result, strategy, function(err, serialized) {
        if(err) return next(err);

        res.send(serialized);
      });
    }, next);


};