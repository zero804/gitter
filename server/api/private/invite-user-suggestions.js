'use strict';

var BackendMuxer = require('gitter-web-backend-muxer');


var resolveInviteUserSuggestions = function(req, res, next) {
  // null, 'GH_REPO', 'GH_ORG'
  var type = req.query.type;
  var linkPath = req.query.linkPath;
  var user = req.user;

  var backendMuxer = new BackendMuxer(user);

  return backendMuxer.getInviteUserSuggestions(type, linkPath)
    .then(function(suggestions) {
      res.send(suggestions);
    })
    .catch(next);
};

module.exports = resolveInviteUserSuggestions;
