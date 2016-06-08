#!/usr/bin/env node
/*jslint node: true */
"use strict";

var env = require('gitter-web-env');
var winston = env.logger;
var shutdown = require('shutdown');
var Promise = require('bluebird');
var userRemovalService = require('../../server/services/user-removal-service');
var roomService = require('../../server/services/room-service');
var userService = require('../../server/services/user-service');
var persistence = require('gitter-web-persistence');
var uriLookupService = require('../../server/services/uri-lookup-service');
var validateUri = require('gitter-web-github').GitHubUriValidator;
var permissionsModel = require('gitter-web-permissions/lib/permissions-model');

var opts = require('yargs')
  .option('username', {
    required: true,
    description: 'Username of the user to make into an org'
  })
  .option('first-user', {
    required: true,
    description: 'User to add to the org room'
  })
  .option('dry-run', {
    type: 'boolean',
    alias: 'd',
    description: 'Just show the users who will be affected'
  })
  .help('help')
  .alias('help', 'h')
  .argv;

require('../../server/event-listeners').install();

function performUserToOrgTransition(usernameForConversion, firstUserUsername, dryRun) {
  var context = {};

  /* Find the old user and the new org */
  return Promise.all([userService.findByUsername(usernameForConversion), userService.findByUsername(firstUserUsername)])
    .spread(function(userForConversion, firstUser) {
      if (!firstUser) throw new Error('Not found: ' + firstUserUsername);
      context.userForConversion = userForConversion;
      context.firstUser = firstUser;
      return [validateUri(firstUser, usernameForConversion), permissionsModel(firstUser, 'create', usernameForConversion, 'ORG', null)];
    })
    .spread(function(githubInfo, hasAccess) {
      /* Remove the user */
      if (!githubInfo) throw new Error('Not found: github uri: ' + usernameForConversion);
      if (githubInfo.type !== 'ORG') throw new Error('Github uri is not an ORG: ' + usernameForConversion);
      if (!hasAccess) throw new Error('User ' + firstUserUsername + ' does not have access to ' + usernameForConversion);

      if (dryRun) return;
      return userRemovalService.removeByUsername(usernameForConversion, { deleteUser: true });
    })
    .then(function() {
      /* Remove URI lookup */
      if (dryRun) return;
      return uriLookupService.removeBadUri(usernameForConversion);
    })
    .then(function() {
      /* Create the org room */
      if (dryRun) return;
      return roomService.createRoomByUri(context.firstUser, usernameForConversion);
    })
    .then(function(findOrCreateResult) {
      /* Find all child orgs */
      if (findOrCreateResult && findOrCreateResult.troupe) {
        context.newOrgRoom = findOrCreateResult.troupe;
      } else {
        if (!dryRun) throw new Error('Unable to create room');
      }

      var orQuery = [{
        lcOwner: usernameForConversion.toLowerCase(),
        githubType: 'USER_CHANNEL'
      }];

      if (context.userForConversion) {
        orQuery.push({ ownerUserId: context.userForConversion._id });
      }

      return persistence.Troupe.find({ $or: orQuery }).exec();
    })
    .then(function(troupesForUpdate) {
      /* Update the org rooms */
      troupesForUpdate.forEach(function(t) {
        if (t.githubType !== 'USER_CHANNEL') {
          throw new Error('Unexpected githubType type ' + t.githubType);
        }
      });

      return Promise.all(troupesForUpdate.map(function(t) {
        t.githubType = 'ORG_CHANNEL';
        console.log(t.uri);

        if (dryRun) return;
        delete t.ownerUserId;
        t.parentId = context.newOrgRoom._id;

        return t.save();
      }));
    });

}

performUserToOrgTransition(opts.username, opts['first-user'], opts['dry-run'])
  .delay(5000)
  .then(function() {
    shutdown.shutdownGracefully();
  })
  .catch(function(err) {
    console.error('Error: ' + err, err.stack);
    shutdown.shutdownGracefully(1);
  })
  .done();
