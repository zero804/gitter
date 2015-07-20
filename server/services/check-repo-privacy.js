#!/usr/bin/env node

/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var GithubRepoService = require('gitter-web-github').GitHubRepoService;
var roomService = require('./room-service');

function checkRepoPrivacy(uri) {
  var repoService = new GithubRepoService();
  return repoService.getRepo(uri)
    .then(function(repo) {
      if(!repo || repo.private) {
        return roomService.ensureRepoRoomSecurity(uri, 'PRIVATE');
      }

      return roomService.ensureRepoRoomSecurity(uri, 'PUBLIC');
    })
    .fail(function(err) {
      throw err;
    });
}

module.exports = checkRepoPrivacy;
