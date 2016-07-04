'use strict';

var collaboratorsService = require('gitter-web-collaborators');

function resolveInviteUserSuggestions(req, res, next) {
  // null, 'GH_REPO', 'GH_ORG'
  var type = req.query.type;
  var linkPath = req.query.linkPath;

  return collaboratorsService.findCollaborators(req.user, type, linkPath)
    .then(function(suggestions) {
      res.send(suggestions);
    })
    .catch(next);
}

module.exports = resolveInviteUserSuggestions;
