'use strict';

var collaboratorsService = require('gitter-web-collaborators');

function resolveInviteUserSuggestions(req, res, next) {
  // null, 'GH_REPO', 'GH_ORG'
  var type = req.query.type;
  var linkPath = req.query.linkPath;

  return collaboratorsService.findCollaborators(req.user, type, linkPath)
    .then(function(suggestions) {
      console.log('suggestions', suggestions);
      res.send(suggestions);
    })
    .catch(function(err) {
      console.log('err', err, err.stack);
      throw err;
    })
    .catch(next);
}

module.exports = resolveInviteUserSuggestions;
