#!/usr/bin/env node

'use strict';

var shutdown = require('shutdown');
var persistence = require('gitter-web-persistence');
var uriLookupService = require('../../server/services/uri-lookup-service');



var readline = require('readline');
var Promise = require('bluebird');

require('../../server/event-listeners').install();

var opts = require('yargs')
  .option('old', {
    alias: 'o',
    required: true,
    description: 'Old uri for the organisation'
  })
  .option('new', {
    alias: 'n',
    required: true,
    description: 'New uri for the organisation'
  })
  .help('help')
  .alias('help', 'h')
  .argv;

var lcOld = opts.old.toLowerCase();
var lcNew = opts.new.toLowerCase();

function mapUri(oldName, oldUri, newUri) {
  if (oldName === oldUri) return newUri;
  return oldName.replace(/^[\w\-\_]+\//, newUri + '/');
}

function checkForClashes(newUris) {
  var lcNewUris = newUris.map(function(u) {
    return u.toLowerCase();
  });
  return persistence.Troupe.find({ lcUri: { $in: lcNewUris } })
    .exec();
}

function confirm() {
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(function(resolve, reject) {
    rl.question('Are you sure you want to perform these renames? Type "yes"? ', function(answer) {
      rl.close();

      if (answer === 'yes') return resolve();
      reject(new Error('no'));
    });
  });
}

persistence.Group.find({ lcUri: lcOld })
  .exec()
  .then(function(group) {
    if(!group) {
      throw new Error('Group not found');
    }

    console.log('Group', group);

    return persistence.Troupe.find({ groupId: group._id })
      .exec()
      .then(function(rooms) {
        console.log('rooms', rooms);

        var newUris = rooms.map(function(f) {

          return mapUri(f.uri, opts.old, opts.new);
        });

        return checkForClashes(newUris)
          .then(function(clashRooms) {
            if (clashRooms.length) {
              throw new Error('URI Clash: ' + clashRooms.map(function(t) { return t.uri; }).join(','));
            }

            rooms.forEach(function(room) {
              console.log(room.uri, '->', mapUri(room.uri, opts.old, opts.new));
            });

            return confirm();
          })
          .then(function() {
            console.log('Updating group ', opts.old, ' to ', opts.new);

            group.name = opts.new;
            group.uri = opts.new;
            group.lcUri = lcNew;
            if(group.sd.type === 'GH_ORG') {
              group.sd.linkPath = opts.new;
            }

            return group.save();
          })
          .then(function() {
            return Promise.map(rooms, function(room) {
              var newName = mapUri(room.uri, opts.old, opts.new);
              var lcNewName = newName.toLowerCase();
              var oldName = room.uri;
              var lcOldName = oldName.toLowerCase();
              room.uri = newName;
              room.lcUri = lcNewName;

              /* Only add if it's not a case change */
              if (lcOldName !== lcNewName) {
                room.renamedLcUris.addToSet(lcOldName);
              }
              console.log('Updating ', oldName, ' to ', newName);

              return room.save()
                .then(function() {
                  return uriLookupService.removeBadUri(lcOldName);
                })
                .then(function() {
                  return uriLookupService.reserveUriForTroupeId(room.id, lcNewName);
                });

            }, { concurrency: 1 })
          });

      });
  })


  .delay(2000)
  .then(function() {
    shutdown.shutdownGracefully();
  })
  .done();
