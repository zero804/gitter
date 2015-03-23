/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var StatusError  = require('statuserror');
var troupeService = require('./troupe-service');
var persistence = require('./persistence-service');
var Q = require('q');

var MAX_FREE_MEMBER_COUNT = 25;

function assertMemberLimit(room, user) {
  // public room? you dont need to pay.
  if (room.security === 'PUBLIC') return Q.resolve();

  // already in the room? you dont need to pay.
  if (checkUserInRoom(user, room)) return Q.resolve();

  // room has space to add 1 person and stay under the free limit? you dont need to pay.
  var userCount = room.users && room.users.length || 0;
  if (userCount < MAX_FREE_MEMBER_COUNT) return Q.resolve();

  var lcOwner = room.lcOwner;

  return checkIfOrg(lcOwner)
    .then(function(isOrg) {
      // not owned by an org? you dont need to pay.
      if (!isOrg) return;

      var lcOrg = lcOwner;

      return checkIfProOrg(lcOrg)
        .then(function(isPro) {
          // org already paid? you dont need to pay.
          if (isPro) return;

          // you need to pay to proceed. PAY ME!
          var err = new StatusError(402, room.uri + ' has reached its limit for private members');
          err.uri = room.uri;
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
