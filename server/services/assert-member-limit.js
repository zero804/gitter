/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var StatusError  = require('statuserror');
var troupeService = require('./troupe-service');
var persistence = require('./persistence-service');
var verbose = require('gitter-web-env').logger.verbose;
var nconf = require('../utils/config');
var Q = require('q');

var maxFreeOrgRoomMembers = nconf.get('maxFreeOrgRoomMembers');

function assertMemberLimit(room, user) {
  var username = user && user.username;
  var uri = room && room.uri;

  if (room.security === 'PUBLIC') {
    verbose(uri + ' is a public room. you dont need to pay.');
    return Q.resolve();
  }

  if (checkUserInRoom(user, room)) {
    verbose(username + ' is already in ' + uri + '. you dont need to pay.');
    return Q.resolve();
  }

  var userCount = room.users && room.users.length || 0;
  if (userCount < maxFreeOrgRoomMembers) {
    verbose(uri + ' has space to add 1 person and stay under the free limit. you dont need to pay.');
    return Q.resolve();
  }

  var owner = room.uri.split('/')[0];

  return checkIfOrg(owner)
    .then(function(isOrg) {
      if (!isOrg) {
        verbose(uri + ' is not owned by an org. you dont need to pay.');
        return;
      }

      var org = owner;

      return checkIfProOrg(org)
        .then(function(isPro) {
          if (isPro) {
            verbose(uri + ' is covered by an pro org plan. you dont need to pay.');
            return;
          }

          // you need to pay to proceed. PAY ME!
          var err = new StatusError(402, uri + ' has reached its limit for private members');
          err.uri = uri;
          throw err;
        });
    }); 
}

function checkUserInRoom(user, room) {
  if (!user || !user.id || !room.users) return false;

  var memberIds = room.users.map(function(member) {
    return member.userId.toString();
  });

  return memberIds.indexOf(user.id.toString()) >= 0;
}

function checkIfOrg(owner) {
  // orgs arnt first class objects, so we have to make an educated guess.
  // we will assume that all orgs have an org root room, even though this
  // wont catch org repo rooms (+ repo channels) that dont have an org root room.
  // better to let people get stuff for free than overcharge them...
  return troupeService.findByUri(owner)
    .then(function(room) {
      if (!room) return false;

      return room.githubType === 'ORG';
    });
}

function checkIfProOrg(org) {
  var lcUri = org.toLowerCase();

  return persistence.Subscription.findOneQ({
    lcUri: lcUri,
    subscriptionType: 'ORG',
    status: 'CURRENT'
  }, '_id', { lean: true })
    .then(function(subscription) {
      return !!subscription;
    });
}

module.exports = assertMemberLimit;
