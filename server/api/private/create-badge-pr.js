"use strict";

var badgerService = require('../../services/badger-service');
var troupeService = require('../../services/troupe-service');
var policyFactory = require('gitter-web-permissions/lib/policy-factory');
var StatusError = require('statuserror');

module.exports = function (req, res, next) {
  var uri = "" + req.body.uri;
  var user = req.user;

  return troupeService.findByUri(uri)
    .then(function(troupe) {
      return policyFactory.createPolicyForRoom(user, troupe);
    })
    .then(function(policy) {
      return policy.canAdmin();
    })
    .then(function(isAdmin) {
      if (!isAdmin) {
        throw new StatusError(403, 'admin permissions required');
      }

      return badgerService.sendBadgePullRequest(uri, user);
    })
    .then(function(pr) {
      res.send(pr);
    })
    .catch(next);
};
