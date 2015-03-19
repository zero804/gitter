/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var StatusError  = require('statuserror');
var troupeService = require('./troupe-service');
var persistence = require('./persistence-service');
var Q = require('q');

var MAX_FREE_MEMBER_COUNT = 25;

function assertMemberLimit(uri, security, user) {
  if (security === 'PUBLIC') return Q.resolve();

  var owner = uri.split('/')[0];

  return checkIfOrg(owner)
    .then(function(isOrg) {
      if (!isOrg) return;

      var org = owner;

      return userWithinOrgLimit(user, org)
        .then(function(withinLimit) {
          if (withinLimit) return;

          var err = new StatusError(402, 'org has reached its global limit for private members');
          err.uri = uri;
          throw err;
        });
    }); 
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


function userWithinOrgLimit(user, org) {
  return orgIsPro(org)
    .then(function(isPro) {

    return isPro || userWithinFreeOrgLimit(user, org);
  });
}

function userWithinFreeOrgLimit(user, org) {
  var lcOrg = org.toLowerCase();

  return persistence.Troupe.aggregateQ([
    // find all non public rooms for org
    { $match: { lcOwner: lcOrg, security: { $in: [ 'PRIVATE', 'INHERITED' ] } } },
    // turn each room doc with X users into X room docs with 1 user
    { $unwind: '$users' },
    // create list of distinct users
    { $group: { _id: '$users.userId' } }

  ]).then(function(members) {

    var memberIds = members.map(function(member) {
      return member.id;
    });

    // if user is already counted as a member, then
    // adding them wont increase the org private member count
    if(user && memberIds.indexOf(user.id) >= 0) return true;

    return memberIds.length < MAX_FREE_MEMBER_COUNT;
  });
}

function orgIsPro(org) {
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
