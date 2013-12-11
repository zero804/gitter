#!/usr/bin/env node

/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence = require('../server/services/persistence-service');
var GitHubMeService = require('../server/services/github/github-me-service');
var Q = require('q');
var mcapi = require('mailchimp-api');
var mc = new mcapi.Mailchimp('a93299794ab67205168e351adb03448e-us3');
var github = require('troupe-octonode');

var opts = require("nomnom")
  .option('username', {
    abbr: 'u',
    required: false,
    help: 'Username of the user'
  })
  .option('email', {
    abbr: 'e',
    required: false,
    help: 'Email address of the user'
  })
  .option('count', {
    abbr: 'c',
    required: false,
    default: 10,
    help: 'Email address of the user'
  })
  .option('token', {
    abbr: 't',
    required: false,
    help: 'Github token'
  })
  .parse();


function die(error) {
  console.error(error);
  console.error(error.stack);
  process.exit(1);
}

function boost(username, suggestedEmail) {
  return persistence.User.findOneQ({ username: username })
    .then(function(user) {
      var githubClient = github.client(user && (user.githubToken || user.githubUserToken) || opts.token);
      var ghuser = githubClient.user(username);

      var d = Q.defer();
      ghuser.info(d.makeNodeResolver());
      return d.promise
        .fail(function(err) {
          if(err.statusCode === 404) return null;
          throw err;
        })
        .then(function(githubUser) {
          return [user, githubUser];
        });
    })
    .spread(function(user, githubUser) {
      if(!githubUser) throw "Not found";
      var emailPromise;
      if(suggestedEmail) {
        emailPromise = Q.resolve(suggestedEmail);
      } else if(user && user.emails && user.emails.length) {
        emailPromise = Q.resolve(user.emails[0]);
      } else if(user && user.hasGitHubScope('user:email')) {
        var meService = new GitHubMeService(user);
        console.log("got here");
        emailPromise = meService.getEmails()
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
      // if(!email) throw "Unable to obtain email address for " + opts.username;

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
      if(!email) {
        console.log("User " + user.username + " not emailed as we had no address");
      return;
      }

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
    });
}

function boostMany(count) {
  return persistence.User.find({ $or: [ { 'permissions.createRoom': false }, { 'permissions.createRoom': { $exists: false } }  ] })
    .sort({ _id: 1 })
    .limit(count)
    .execQ()
    .then(function(users) {
      console.log('Boosting ' + users.map(function(f) { return f.username; }).join(', '));
      return Q.all(users.map(function(user) {
        return boost(user.username)
          .then(function() {
            console.log('Boosted ' + user.username);
          })
          .fail(function(err) {
            console.error('Failed to boost ' + user.username + ':', err);
          });
      }))
      .then(function() {
        process.exit(0);
      })
      .fail(function(err) {
        die(err);
      });
    });
}


var op;

if(opts.username) {
  op = boost(opts.username, opts.email);
} else {
  op = boostMany(parseInt(opts.count, 10));
}

op.then(function() {
    process.exit(0);
  })
  .fail(function(err) {
    die(err);
  });
