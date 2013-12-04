/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var github = require('troupe-octonode');
var assert = require('assert');
var winston = require('winston');
var request = require('request');

function requestWrapper(options, callback) {
  winston.info('github request made', options);
  request(options, callback);
}

function createClient(user) {
  assert(user && user.githubToken, 'User must have a githubToken');

  var client = github.client(user.githubToken, requestWrapper);
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