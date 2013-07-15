/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var troupeService = require("../../services/troupe-service"),
    uriService = require("../../services/uri-service"),
    winston = require('winston');

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
          return troupeService.inviteUserByUserId(null, req.user, toUser.id);
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
