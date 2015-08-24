"use strict";

var testRequire = require('../test-require');

var readyByService = testRequire('./services/readby-service');
var persistenceService = testRequire('./services/persistence-service');
var mongoUtils = testRequire('./utils/mongo-utils');
var collections = testRequire('./utils/collections');
var fixtureLoader = require('../test-fixtures');

var assert = require("assert");

describe('readby-service', function() {

  var fixture = {};

  before(fixtureLoader(fixture, {
    user1: { },
    user2: { },
    message1: {
      user: 'user1',
      troupe: 'troupe1',
      text: 'old_message',
      sent: new Date("01/01/2014")
    },
    message2: {
      user: 'user1',
      troupe: 'troupe1',
      text: 'old_message',
      sent: new Date("01/01/2014")
    },
    troupe1: { users: ['user1', 'user2'] }
  }));

  after(function() {
    fixture.cleanup();
  });

  describe('batchUpdateReadbyBatch', function() {

    it('should batch update the readby for lots of chat messages', function(done) {
      var user1 = fixture.user1;
      var user2 = fixture.user2;
      var message1 = fixture.message1;
      var message2 = fixture.message2;

      readyByService.testOnly.batchUpdateReadbyBatch(fixture.troupe1.id, [
        user1.id + ':' + message1.id,
        user2.id + ':' + message1.id,
        user1.id + ':' + message2.id

        ], function(err) {
          if (err) return done(err);
          persistenceService.ChatMessage
            .find({ _id: { $in: [message1._id, message2._id] } })
            .exec(function(err, chats) {
              var chatsById = collections.indexById(chats);
              var m1 = chatsById[message1.id];
              var m2 = chatsById[message2.id];

              assert.strictEqual(m1.readBy.length, 2);
              assert.strictEqual(m2.readBy.length, 1);
              assert(m1.readBy.indexOf(user1._id) >= 0);
              assert(m1.readBy.indexOf(user2._id) >= 0);
              assert(m2.readBy.indexOf(user1._id) >= 0);
              done();
            });
        });
    });
  });
});
