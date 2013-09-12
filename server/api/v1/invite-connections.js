/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeService     = require('../../services/troupe-service');
var restSerializer    = require("../../serializers/rest-serializer");
var collections       = require("../../utils/collections");
var Q                 = require('q');

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

  Q.all(promises).then(function(results) {

    var invites = results.filter(function(i) { return !i.ignored; });

    var strategy = new restSerializer.InviteStrategy({ currentUserId: req.user.id });
    restSerializer.serialize(invites, strategy, function(err, serialized) {
      if(err) return next(err);
      var indexedSerialized = collections.indexById(serialized);

      res.send(results.map(function(invite) {
        if(invite.ignored) return invite;
        return indexedSerialized[invite.id];
      }));

    });



  }, next);


};