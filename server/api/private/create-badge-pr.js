/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";
var conf = require('../../utils/config');
var badgerService = require('../../services/badger-service');


module.exports = function (req, res, next) {
  var content = '[![Gitter]('+ conf.get('web:badgeBaseUrl') + '/Join Chat.svg)](' + conf.get('web:basepath') + '/' + req.body.uri + '?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)';

  return badgerService
    .updateFileAndCreatePullRequest(req.body.uri, req.user.username, 'master', 'gitter-badge', content)
    .then(function (pr) {
      res.send(pr);
    })
    .fail(function (err) {
      console.error(err);
      next(err);
    });
};
