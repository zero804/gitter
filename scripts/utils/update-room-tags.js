/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var Q = require('Q');
var persistence = require('../../server/services/persistence-service');
var GitHubService = require('../../server/services/github/github-repo-service');
var github = new GitHubService();

var autoTagger = require('../../server/utils/room-tagger');

// gets list of rooms from DB
var findRooms = function (limit) {
  console.log('finding rooms...');
  limit = (typeof limit !== 'undefined') ? limit : 0;

  return persistence.Troupe
    .find({
      security: 'PUBLIC',
      githubType: 'REPO'
    })
    .limit(limit)
    .execQ();
};

// run
findRooms(50)
  .then(function (rooms) {
    console.log('rooms:', rooms.length);
    return Q.all(rooms.map(function (room) {
      return Q.all([
        room,
        github.getRepo(room.lcUri)
      ]);
    }));
  })
  .then(function (result) {
    result.forEach(function (data) {
      // data -> [room, repo]
      var tags = autoTagger(data[0], data[1]);
      console.log(data[0].lcUri, ':');
      console.log('tags:', tags);
      console.log('---------\n');
    });
  })
  .catch(function (err) {
    console.log('err:', err);
  });