/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var badgerService = require('../../services/badger-service');
var troupeService = require('../../services/troupe-service');
var roomPermissionsModel = require('../../services/room-permissions-model');
var StatusError = require('statuserror');

module.exports = function (req, res, next) {
  var uri = "" + req.body.uri;
  var user = req.user;

  return troupeService.findByUri(uri)
    .then(function(troupe) {
      return roomPermissionsModel(user, 'admin', troupe);
    })
    .then(function(isAdmin) {
      if (!isAdmin) throw new StatusError(403, 'admin permissions required');

      return badgerService.sendBadgePullRequest(uri, user);
    })
    .then(function(pr) {
      res.send(pr);
    })
    .fail(next);
};
