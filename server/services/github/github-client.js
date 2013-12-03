/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var github = require('octonode');
var assert = require('assert');
var winston = require('winston');

function createClient(user) {
  assert(user && user.githubToken, 'User must have a githubToken');

  var client = github.client(user.githubToken);
  // client.middlewares.push(function(err, res, body, next) {
  //   if(res.statusCode >= 400 && res.statusCode != 404) {
  //     winston.error("Github failure", res.headers);
  //     winston.error("Github failure", body);
  //   }
  //   next(err, res, body);
  // });

  return client;
}

module.exports = exports = createClient;