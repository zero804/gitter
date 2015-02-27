#!/usr/bin/env node

/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var GithubRepoService = require('./github/github-repo-service');
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
