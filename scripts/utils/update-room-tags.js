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

// context is a room, wrapper around Github service
var fetchGithubInfo = function () {
  var github = new GitHubService(/*user*/);
  return github.getRepo(this.lcUri);
};

// context is room, returns a promise that returns an array containing -> [room, repo]
var combineInfo = function (repo) {
  return Q.all([ this, repo ]);
};

// function to be called with filters, returns an array of rooms filtered by whether it's empty or not
var ignoreEmptyRooms = function (rooms) {
  return rooms.filter(function (room) {
    return room.users.length !== 0;
  });
};

// responsible for getting the GH information and then combining the result into an array, once resolved
var prepareRooms = function (rooms) {
  return Q.all(rooms.map(function (room) {
    var id = room.users[0].userId;
    return persistence.User.findByIdQ(id)
      .then(fetchGithubInfo.bind(room))
      .then(combineInfo.bind(room));
  }));
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
// FIXME: actually save them
var saveRooms = function (rooms) {
  console.log('saveRooms() ====================');
  console.log('will save', rooms.length);
  return Q.all(
    rooms.map(function (room) {
      // should save all the rooms
      console.log('room.uri:', room.uri, '| tags: ', room.tags.length);
    })
  );
};

// reponsible for running the procedure
findRooms(10)
  .then(ignoreEmptyRooms)
  .then(prepareRooms)
  .then(tagRooms)
  // .then(saveRooms)
  .catch(function (err) {
    console.log('err:', err.stack);
  });