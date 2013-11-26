/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence = require('./persistence-service');
var GitHubOrgService = require('./github/github-org-service');
var assert = require("assert");
var ObjectID = require('mongodb').ObjectID;
var Q = require('q');
var winston = require('winston');

function findOrCreateRoom(options) {
  assert(options);
  assert(options.uri);
  assert(options.githubType);

  var uri = options.uri;
  var githubType = options.githubType;
  var user = options.user;

  var users = user ? [{ _id: new ObjectID(), userId: user._id }] : [];

  return persistence.Troupe.findOneAndUpdateQ(
    { uri: uri, githubType: githubType },
    {
      $setOnInsert: {
        uri: uri,
        githubType: githubType,
        users: users
      }
    },
    {
      upsert: true
    })
    .then(function(troupe) {
      if(!user) return troupe;

      if(troupe.containsUserId(user.id)) return troupe;

      troupe.addUserById(user.id);
      return troupe.saveQ().thenResolve(troupe);
    });

}

function checkIfUserHasAccessToOrg(currentUser, orgName) {
  var orgService = new GitHubOrgService(currentUser);
  return orgService.member(orgName, currentUser.username);
}

function isUserAllowedInRoom(user, troupe) {
  // TODO: check for open troupe
  assert(troupe, 'troupe is required');
  assert(user, 'user must have an id');

  var authCheck;
  var userId = user && user.id;

  switch(troupe.githubType) {
    case 'ORG':
      authCheck = checkIfUserHasAccessToOrg(user, troupe.uri);
      break;

    case 'REPO':
      // TODO: add repo level checks
      authCheck = Q.resolve(true);
      break;

    default:
      authCheck = Q.reject('Unknown room type: ' + troupe.githubType);
  }

  // Update the troupe according to this result
  return authCheck.then(function(hasAccess) {
    winston.verbose('Auth check returned: ' + hasAccess);

    var troupeAccess = troupe.containsUserId(userId);
    if(troupeAccess === hasAccess) return hasAccess;

    if(troupeAccess && !hasAccess) {
      troupe.removeUserById(userId);
      return troupe.saveQ().thenResolve(hasAccess);
    }

    troupe.addUserById(userId);
    return troupe.saveQ().thenResolve(hasAccess);
  });
}

exports.findOrCreateRoom    = findOrCreateRoom;
exports.isUserAllowedInRoom = isUserAllowedInRoom;
