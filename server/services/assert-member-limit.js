"use strict";

var StatusError  = require('statuserror');
var troupeService = require('./troupe-service');
var persistence = require('./persistence-service');
var nconf = require('../utils/config');
var debug = require('debug')('gitter:assert-room-limit');
var Promise = require('bluebird');
var roomMembershipService = require('./room-membership-service');

var maxFreeOrgRoomMembers = nconf.get('maxFreeOrgRoomMembers');

function assertMemberLimit(room, user) {
  var username = user && user.username;
  var uri = room && room.uri;

  if (room.security === 'PUBLIC') {
    debug('%s is a public room. you dont need to pay.', uri);
    return Promise.resolve();
  }

  return checkUserInRoom(user, room)
    .then(function(isMember) {
      if (isMember) {
        debug('%s is already in ' + uri + '. you dont need to pay.', username);
        return;
      }

      return roomMembershipService.countMembersInRoom(room._id)
        .then(function(memberCount) {
          if (memberCount < maxFreeOrgRoomMembers) {
            debug('%s has space to add 1 person and stay under the free limit. you dont need to pay.', uri);
            return;
          }

          var owner = room.uri.split('/')[0];

          return checkIfOrg(owner)
            .then(function(isOrg) {
              if (!isOrg) {
                debug('%s is not owned by an org. you dont need to pay.', uri);
                return;
              }

              var org = owner;

              return checkIfProOrg(org)
                .then(function(isPro) {
                  if (isPro) {
                    debug('%s is covered by an pro org plan. you dont need to pay.');
                    return;
                  }

                  // you need to pay to proceed. PAY ME!
                  var err = new StatusError(402, uri + ' has reached its limit for private members');
                  err.uri = uri;
                  throw err;
                });
            });

        });
    });
}

function checkUserInRoom(user, room) {
  if (!user) return Promise.resolve(false);
  return roomMembershipService.checkRoomMembership(room._id, user._id);
}

function checkIfOrg(owner) {
  // orgs arnt first class objects, so we have to make an educated guess.
  // we will assume that all orgs have an org root room, even though this
  // wont catch org repo rooms (+ repo channels) that dont have an org root room.
  // better to let people get stuff for free than overcharge them...
  return troupeService.checkGitHubTypeForUri(owner, 'ORG');
}

function checkIfProOrg(org) {
  var lcUri = org.toLowerCase();

  return persistence.Subscription.findOne({
      lcUri: lcUri,
      subscriptionType: 'ORG',
      status: 'CURRENT'
    }, '_id', { lean: true })
    .exec()
    .then(function(subscription) {
      return !!subscription;
    });
}

module.exports = assertMemberLimit;
