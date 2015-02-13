var userService = require('../../server/services/user-service');
var troupeService = require('../../server/services/troupe-service');
var Q = require('q');
var qlimit = require('qlimit');
var chatService = require('../../server/services/chat-service');
var loremIpsum = require('lorem-ipsum');

var opts = require("nomnom")
.option('room', {
  abbr: 'r',
  required: true
})
.option('users', {
  abbr: 'u',
  required: true,
  list: true
})
.option('count', {
  abbr: 'c',
  default: 1000
})
.parse();

var limit = qlimit(2);

Q.all([
  userService.findByUsernames(opts.users),
  troupeService.findByUri(opts.room)
  ])
  .spread(function(users, room) {
    var a = [];
    for (var i = 0; i < parseInt(opts.count, 10); i++) {
      a.push(i);
    }

    return Q.all(a.map(limit(function(i) {
      var user = users[Math.floor(Math.random() * users.length)];
      return chatService.newChatMessageToTroupe(room, user, { text: loremIpsum({
            count: Math.round(Math.random() * 5) + 1,
            unit: 'paragraph',
            sentenceLowerBound: 1,
            sentenceUpperBound: 15,
            paragraphLowerBound: 1,
            paragraphUpperBound: 4
          })
        })
        .then(function() {
          if(i % 10 === 0) console.log(i);
        });
    })));
  })
  .delay(1000)
  .then(function() {
    process.exit();
  })
  .done();
