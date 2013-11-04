/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var winston       = require('winston');
var troupeService = require("../../services/troupe-service");
var inviteService = require("../../services/invite-service");
var uriService    = require("../../services/uri-service");

module.exports = function(req, res, next) {
  req.checkBody('appUri', 'Invalid appUri').notEmpty();

  var mappedErrors = req.validationErrors(true);

  if (mappedErrors) {
    res.send({ success: false, validationFailed: true, errors: mappedErrors}, 400);
    return;
  }

  var uri = req.body.appUri;

  uriService.findUri(uri)
      .then(function(result) {
        if(!result) { winston.error("No troupe with uri: " + uri); throw 404; }

        var toTroupe = result.troupe;
        var toUser = result.user;

        if(toUser) {
          // Invite the user to connect
          return inviteService.inviteUserByUserId(null, req.user, toUser.id);
        }

        if(toTroupe) {
          // Request access to a troupe
          return troupeService.addRequest(toTroupe, req.user);
        }

        throw new Error('Expected either a troupe or user attribute');
      })
      .then(function() {
        res.send({ success: true });
      })
      .fail(next);
};
