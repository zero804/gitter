/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var github = require('troupe-octonode');
var assert = require('assert');
var request = require('request');
var fetchAllPages = require('./fetch-all-pages');
var logFailingRequest = require('./log-failing-request');


function createClient(user) {
  assert(user && user.githubToken, 'User must have a githubToken');

  // var client = github.client(user.githubToken, fetchAllPages(request));
  var client = github.client(user.githubToken, logFailingRequest(request));
  return client;
}

module.exports = exports = createClient;