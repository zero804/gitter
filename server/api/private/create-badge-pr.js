/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var conf            = require('../../utils/config');
var badgerService   = require('../../services/badger-service');
var env             = require('../../utils/env');
var stats           = env.stats;

module.exports = function (req, res, next) {
  stats.event('badger.clicked', {userId: req.user.id});

  var content = '[![Gitter]('+ conf.get('web:badgeBaseUrl') + '/Join Chat.svg)](' + conf.get('web:basepath') + '/' + req.body.uri + '?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)';

  return badgerService
    .updateFileAndCreatePullRequest(req.body.uri, req.user.username, 'master', 'gitter-badge', content)
    .then(function (pr) {
      stats.event('badger.succeeded', {userId: req.user.id});
      res.send(pr);
    })
    .fail(function (err) {
      stats.event('badger.failed', {userId: req.user.id});
      console.error(err);
      next(err);
    });
};
