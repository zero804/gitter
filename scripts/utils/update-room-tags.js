/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var Q = require('Q');
var persistence = require('../../server/services/persistence-service');
var GitHubService = require('../../server/services/github/github-repo-service');
var fs = require('fs');

var autoTagger = require('../../server/utils/room-tagger');

// gets list of rooms from DB
var findRooms = function (limit) {
  console.log('findRooms() ====================');
  limit = (typeof limit !== 'undefined') ? limit : 0;

  return persistence.Troupe
    .find({
      // $where: 'this.users.length > 25',
      security: 'PUBLIC',
      githubType: 'REPO'
    })
    .lean()
    .limit(limit)
    .execQ();
};

// creates a github service for each user, to avoiding flooding one token
var createGithubService = function (user) {
  console.log('createGithubService() ====================');
  return new GitHubService(/*user*/);
};

// deals with [room, info] returning an array of rooms with the added tags
var tagRooms = function (result) {
  console.log('tagRooms() ====================');
  return result.map(function (data) {
    data[0].tags = autoTagger(data[0], data[1]); // tagging
    return data[0];
  });
};

// iterates to the now tagged rooms and saves them
var saveRooms = function (rooms) {
  console.log('saveRooms() ====================');
  console.log('will save', rooms.length);
  return Q.all(
    rooms.map(function (room) {
      // should save all the rooms
      console.log('room.uri:', room.uri, '| tags: ', rooms.tags.length);
    })
  );
};

// find all rooms
findRooms(10)
  .then(function (rooms) {
    // console.log('found', rooms.length);
    return Q.all(
      rooms
        .filter(function (room) {
          // console.log('filtering rooms');
          return room.users.length !== 0;
        })
        .map(function (room) {
          // console.log('mapping rooms');
          var id = room.users[0].userId;
          return persistence.User.findByIdQ(id)
            .then(createGithubService)
            .then(function (github) {
              // console.log('github service created...');
              // console.log('getting repo info...');
              return github.getRepo(room.lcUri);
            })
            .then(function (repo) {
              // console.log('got repo info.');
              return Q.all([ room, repo ]);
            });
        }));
  })
  .then(tagRooms)
  .then(saveRooms)
  .catch(function (err) {
    console.log('err:', err);
  });