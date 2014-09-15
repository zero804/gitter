/*jshint globalstrict:true, trailing:false, unused:true, node:true */
/**
 * update-room-tags script
 * ====
 *
 * a procedure that will look for all rooms in given environment updating their tags
 */
'use strict';

var Q = require('Q');
var persistence = require('../../server/services/persistence-service');
var GitHubService = require('../../server/services/github/github-repo-service');
var throat = require('throat');

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
      githubType: 'REPO'
    })
    .limit(limit)
    .execQ();
};

// context is a room, wrapper around Github service
var fetchGithubInfo = function (user) {
  console.log('fetchGithubInfo() ====================');
  if (user === null) console.log('user not found, using standard token');
  user = user || undefined;
  var github = new GitHubService(user);
  return github.getRepo(this.lcUri);
};

// context is room, returns a promise that returns an array containing -> [room, repo]
var combineInfo = function (repo) {
  return [this, repo];
};

// function to be called with filters, returns an array of rooms filtered by whether it's empty or not
var removeEmptyRooms = function (rooms) {
  console.log('total rooms:', rooms.length);
  return rooms.filter(function (room) {
    return room.users.length !== 0;
  });
};

// responsible for getting the GH information and then combining the result into an array, once resolved
var prepareRooms = function (rooms) {
  console.log('non-empty rooms:', rooms.length);
  return Q.all(
    // notice the limit on concurrent calls
    rooms.map(throat(CONCURRENCY_LIMIT, function (room) {
      var id = room.users[0].userId;
      return persistence.User.findByIdQ(id)
        .then(fetchGithubInfo.bind(room))
        .catch(function () {
          return null;
        })
        .then(combineInfo.bind(room));
    })
  ));
};

// deals with [room, info] returning an array of rooms with the added tags
var tagRooms = function (result) {
  console.log('tagRooms() ====================');
  return result.filter(function (data) {
    return !!(data);
  }).map(function (data) {
    var room = data[0];
    var repo = data[1];
    room.tags = roomTagger(room, repo); // tagging
    return room;
  });
};

// iterates to the now tagged rooms and saves them
var saveRooms = function (rooms) {
  console.log('saveRooms() ====================');
  return Q.all(
    rooms.map(function (room) {
      console.log('room:', room);
      return room.saveQ()
        .then(console.log.bind(console))
        .catch(function (err) {
          return null;
        });
    })
  );
};

// reponsible for running the procedure
findRooms(20)
  .then(removeEmptyRooms)
  .then(prepareRooms)
  .then(tagRooms)
  .then(saveRooms)
  .then(process.exit)
  .catch(function (err) {
    console.log('err:', err.stack);
  });