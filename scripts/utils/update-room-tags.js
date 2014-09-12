/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var Q = require('Q');
var persistence = require('../../server/services/persistence-service');
var GitHubService = require('../../server/services/github/github-repo-service');
var fs = require('fs');

var autoTagger = require('../../server/utils/room-tagger');

// gets list of rooms from DB
var findRooms = function (limit) {
  console.log('finding rooms...');
  limit = (typeof limit !== 'undefined') ? limit : 0;

  return persistence.Troupe
    .find({
      $where: 'this.users.length > 25',
      security: 'PUBLIC',
      githubType: 'REPO'
    })
    .lean()
    .limit(limit)
    .execQ();
};

// run
findRooms(100)
  .then(function (rooms) {
    return Q.all(rooms.map(function (room) {
      return persistence.User
        .findByIdQ(room.users[0].userId)
        .then(function (user) {
          console.log('user:', user);
          var github = new GitHubService();

          return Q.all([
            room,
            github.getRepo(room.lcUri)
          ]);
        });
    }));
  })
  .then(function (result) {
    return Q.all(result.map(function (data) {
        data[0].tags = autoTagger(data[0], data[1]);
        return data[0];
      })
    );
  })
  .then(function (rooms) {
    var criteria = 'php';
    console.log('rooms.length:', rooms.length);
    rooms = rooms.filter(function (room) {
      return room.tags.indexOf(criteria) >= 0;
      // console.log(room.uri, '====================');
      // console.log('room.users.length:', room.users.length);
      // console.log('room.tags:', room.tags);
      // console.log('\n');
    });
    console.log('rooms.length:', rooms.length);

    fs.writeFile('rooms_'+criteria+'.json', JSON.stringify(rooms, null, 4), function(err) {
      if (err) {
        console.log(err);
      } else {
        console.log('saved json');
      }
    });
  })
  .catch(function (err) {
    console.log('err:', err);
  });