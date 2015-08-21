#!/usr/bin/env node

/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence = require('../server/services/persistence-service');
var checkRepoPrivacy = require('../server/services/check-repo-privacy');

var Q = require('q');

var opts = require("nomnom")
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

persistence.Troupe
  .where('githubType', 'REPO')
  .sort({ dateLastSecurityCheck: 1 })
  .limit(opts.max)
  .execQ()
  .then(function(repos) {
    return Q.all(repos.map(function(repo) {
      return checkRepoPrivacy(repo.uri);
    }));
  })
  .then(function() {
    process.exit(0);
  })
  .catch(function(err) {
    die(err);
  });
