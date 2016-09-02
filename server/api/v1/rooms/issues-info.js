'use strict';

var roomRepoService = require('../../../services/room-repo-service');
var loadTroupeFromParam = require('./load-troupe-param');

module.exports = {
  id: 'issue-info',

  index: function(req) {
    return loadTroupeFromParam(req)
      .then(function(troupe) {
        return roomRepoService.findAssociatedGithubRepoForRoom(troupe);
      })
      .then(function(repoUri) {
        return {
          repos: [{
            uri: repoUri
          }]
        }
      });
  }
};
