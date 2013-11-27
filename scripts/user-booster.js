#!/usr/bin/env node

/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence = require('../server/services/persistence-service');
var GitHubUserService = require('../server/services/github/github-user-service');
var Q = require('q');
var mcapi = require('mailchimp-api');
var mc = new mcapi.Mailchimp('a93299794ab67205168e351adb03448e-us3');

var opts = require("nomnom")
  .option('username', {
    abbr: 'u',
    required: true,
    help: 'Username of the user'
  })
  .option('email', {
    abbr: 'e',
    required: false,
    help: 'Email address of the user'
  })
  .parse();


function die(error) {
  console.error(error);
  process.exit(1);
}

persistence.User.findOneQ({ username: opts.username })
  .then(function(user) {
    if(user && user.permissions.createRoom) throw "Already boosted";

    var userService = new GitHubUserService(user && user.githubToken ? user : null);
    return userService.getUser(opts.username)
      .then(function(githubUser) {
        return [user, githubUser];
      });
  })
  .spread(function(user, githubUser) {
    if(!githubUser) throw "Not found";

    var emailPromise;
    var userService = new GitHubUserService(user && user.githubToken ? user : null);

    if(opts.email) {
      emailPromise = Q.resolve(opts.email);
    } else if(user && user.githubToken) {
      emailPromise = userService.getAuthenticatedUserEmails()
        .then(function(emails) {
          if(Array.isArray(emails)) {
            return emails[0];
          }
        });
    } else {
      emailPromise = Q.resolve(githubUser.email);
    }

    return emailPromise.then(function(email) {
      return [user, githubUser, email];
    });
  })
  .spread(function(user, githubUser, email) {
    if(!email) throw "Unable to obtain email address for " + opts.username;

    if(!user) {
      user = new persistence.User();
    }

    user.username = githubUser.login;
    user.githubId = githubUser.id;
    user.displayName = githubUser.name;
    user.gravatarImageUrl = githubUser.avatar_url;
    user.permissions.createRoom = true;

    return user.saveQ().then(function() {
      return [user, githubUser, email];
    });
  })
  .spread(function(user, githubUser, email) {
    var d = Q.defer();

    mc.lists.subscribe({
      id: '86c3c4db71',
      merge_vars: {
        EMAIL: email,
        FNAME: user.displayName,
      },
      double_optin: false,
      update_existing: true,
      send_welcome: false,
      replace_interests: true,
      email: { email: email }
    }, function() {
      d.resolve([user, githubUser, email]);
    }, function(err) {
      return d.reject(err);
    });

    return d.promise;
  })
  .then(function() {
    process.exit(0);
  })
  .fail(function(err) {
    die(err);
  });