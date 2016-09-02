'use strict';

var groupUriChecker = require('gitter-web-groups/lib/group-uri-checker');

function checkGroupUri(req, res, next) {
  return groupUriChecker(req.user, req.query.uri)
    .then(function(info) {
      if (info.allowCreate) {
        res.send({
          type: info.type
        });
      } else if(!info.allowCreate && info.type === 'GH_ORG') {
        res.sendStatus(403);
      } else {
        res.sendStatus(409);
      }
    })
    .catch(next);
}

module.exports = checkGroupUri;
