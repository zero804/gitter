/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var badgerService   = require('../../services/badger-service');

module.exports = function (req, res, next) {
  var uri = "" + req.body.uri;

  return badgerService.sendBadgePullRequest(uri, req.user)
    .then(function(pr) {
      res.send(pr);
    })
    .catch(next);
};
