#!/usr/bin/env node
/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var Q = require('Q');
var persistence = require('../../server/services/persistence-service');
var GitHubService = require('../../server/services/github/github-repo-service');
var assert = require('assert');
var throat = require('throat');
var shutdown = require('shutdown');

var roomTagger = require('../../server/utils/room-tagger');

if (process.env.NODE_ENV === 'prod') {
  console.log('tried to run script on:', process.env.NODE_ENV);
  console.log('exiting...');
  return process.exit(1);
}

// @const
var CONCURRENCY_LIMIT = 5;

// gets list of rooms from DB
var findRooms = function (limit) {
  console.log('findRooms() ====================');
  limit = (typeof limit !== 'undefined') ? limit : 0;

  return persistence.Troupe
    .find({
      'users.1': { $exists: true }, // this essentially queries for non-empty rooms efficiently
      tags: { $exists: false },
      security: 'PUBLIC',
    })
    .limit(limit)
    .execQ();
};

var logArrayLength = function(roomList) {
  console.log('room list:', roomList.length);
  return roomList;
};

var fetchGithubInfo = function (uri, user) {
  console.log('fetchGithubInfo() ====================');
  var github = new GitHubService(user);
  return github.getRepo(uri);
};

var attachRepoInfoForRepoRoom = function (room) {
  return persistence.User.findByIdQ(room.users[0].id)
    .then(function(user) {
      return fetchGithubInfo(room.uri, user);
    })
    .then(function(repo) {
      assert(repo, 'github repo fetch returned falsy');
      return {
        room: room,
        repo: repo
      };
    })
    .catch(function(err) {
      console.error(err.stack);
      return null;
    });
};

var attachRepoInfoToRooms = function (rooms) {
  return Q.all(
    rooms.map(
      throat(CONCURRENCY_LIMIT, function (room) {
        if (room.githubType === 'REPO') {
          return attachRepoInfoForRepoRoom(room);
        } else {
          return { room: room };
        }
      })
    )
  );
};

var filterFailedRooms = function (roomContainers) {
  var newRoomContainers = roomContainers.filter(function(roomContainer) {
    return !!roomContainer;
  });
  console.log('rooms that failed to get github data:', roomContainers.length - newRoomContainers.length);
  return newRoomContainers;
};

// deals with { room: room, repo:repo } returning an array of rooms with the added tags
var tagRooms = function (roomContainers) {
  console.log('tagRooms() ====================');
  return roomContainers.map(function (roomContainer) {
    var room = roomContainer.room;
    var repo = roomContainer.repo;
    room.tags = roomTagger(room, repo); // tagging
    return room;
  });
};

// iterates to the now tagged rooms and saves them
var saveRooms = function (rooms) {
  console.log('saveRooms() ====================');
  return Q.all(
    rooms.map(function (room) {
      return room.saveQ()
        .catch(function (err) {
          return null;
        });
    })
  );
};

// reponsible for running the procedure
findRooms(20)
  .then(logArrayLength)
  .then(attachRepoInfoToRooms)
  .then(logArrayLength)
  .then(filterFailedRooms)
  .then(logArrayLength)
  .then(tagRooms)
  .then(saveRooms)
  .then(logArrayLength)
  .catch(function (err) {
    console.error(err.stack);
  })
  .fin(function() {
    shutdown.shutdownGracefully();
  });
