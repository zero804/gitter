/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var Q = require('q');
var GitHubMeService = require('./github/github-me-service');
var GitHubUserService = require('./github/github-user-service');
var isValidEmail = require('email-validator').validate;

function getPrivateEmailAddress(user) {
  var ghMe = new GitHubMeService(user);
  return ghMe.getEmail();
}

function getValidPublicEmailAddress(user, githubTokenUser) {
  console.log('public', arguments);
  var ghUser = new GitHubUserService(githubTokenUser);
  return ghUser.getUser(user.username)
    .then(function(user) {
      console.log('user',user)
      if(user.email && isValidEmail(user.email)) {
        return user.email;
      }
    });
}

var p = function(user, options) {
  var options = options || {};

  if(user.githubUserToken || user.githubToken) {
    return getPrivateEmailAddress(user);
  } else if(options.githubTokenUser) {
    return getValidPublicEmailAddress(user, options.githubTokenUser);
  } else {
    return Q.resolve(undefined);
  }
}

module.exports = function(user, options) {
  console.log('s', user, options);
  console.trace();
  return p(user, options).then(function(result) {
    // console.log()
    console.trace();
    console.log('@@@@@', result)
    return result;
  })
}
