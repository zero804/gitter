'use strict';

var groupUriChecker = require('../../services/group-uri-checker');

function checkGroupUri(req, res, next) {
  return groupUriChecker(req.user, req.query.uri)
    .then(function(info) {
      if (info.allowCreate) {
        res.send({
          type: info.type,
          allowCreate: info.allowCreate
        });
      } else {
        res.sendStatus(409);
      }
    })
    .catch(next);
}

module.exports = checkGroupUri;
