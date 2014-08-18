/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var env = require('../utils/env');
var config = env.config;

var Q = require('q');
var GitHubMeService = require('./github/github-me-service');
var GitHubUserService = require('./github/github-user-service');
var isValidEmail = require('email-validator').validate;

function getPrivateEmailAddress(user) {
  var ghMe = new GitHubMeService(user);
  return ghMe.getEmail();
}

function getValidPublicEmailAddress(username) {
  var ghUser = new GitHubUserService();
  return ghUser.getUser(username)
    .then(function(user) {
      if(user && user.email && isValidEmail(user.email)) {
        return user.email;
      }
    });
}

module.exports = function (user) {
  if (!user) return Q.reject(new Error('User required'));
  
  if (config.get('email:toAddress')) return config.get('email:toAddress'); // test email address, should be set in `config.user-overrides.json`
  
  if (user.githubUserToken || user.githubToken) { return getPrivateEmailAddress(user); }
  
  return getValidPublicEmailAddress(user.username);
};
