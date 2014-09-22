/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var badgerService   = require('../../services/badger-service');
var stats           = require('../../utils/env').stats;

module.exports = function (req, res, next) {
  var uri = "" + req.body.uri;

  stats.event('badger.clicked', { userId: req.user.id });

  return badgerService.sendBadgePullRequest(uri, req.user)
    .then(function(pr) {
      res.send(pr);
    })
    .fail(next);
};
