#!/usr/bin/env node

/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence = require('../server/services/persistence-service');
var GithubRepoService = require('../server/services/github/github-repo-service');
var roomService = require('../server/services/room-service');

var Q = require('q');

var opts = require("nomnom")
  .option('token', {
    abbr: 't',
    default: 'ac5b214ab993ba4901ec023b3c57e4add2dea06b',
    required: false,
    help: 'Github token'
  })
  .option('max', {
    abbr: 'm',
    default: '50',
    required: false,
    help: 'Maximum count'
  })
  .parse();


function die(error) {
  console.error(error);
  console.error(error.stack);
  process.exit(1);
}


function checkRepo(uri) {
  var repoService = new GithubRepoService({ githubToken: opts.token });
  return repoService.getRepo(uri)
    .then(function(repo) {
      console.log('WHATS UP?', repo && repo.name);
      if(!repo || repo.private) {
        return roomService.ensureRepoRoomSecurity(uri, 'PRIVATE');
      }

      return roomService.ensureRepoRoomSecurity(uri, 'PUBLIC');
    })
    .fail(function(err) {
      throw err;
    });
}

persistence.Troupe
  .where('githubType', 'REPO')
  .sort({ dateLastSecurityCheck: 1 })
  .limit(opts.max)
  .execQ()
  .then(function(repos) {
    return Q.all(repos.map(function(repo) {
      return checkRepo(repo.uri);
    }));
  })
  .then(function() {
    process.exit(0);
  })
  .fail(function(err) {
    die(err);
  });
