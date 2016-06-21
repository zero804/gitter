'use strict';

var groupUriChecker = require('../../services/group-uri-checker');

function checkGroupUri(req, res, next) {
  return groupUriChecker(req.user, req.query.uri)
    .then(function(exists) {
      res.sendStatus(exists ? 419 : 200);
    })
    .catch(next);
}

module.exports = checkGroupUri;
