"use strict";

var testRequire = require('../../test-require');

var fixtureLoader = require('../../test-fixtures');
var assert = require('assert');
var serialize = testRequire('./serializers/serialize');
var ChatStrategy = testRequire('./serializers/rest/chat-strategy');
var _ = require('lodash');


function makeHash() {
  var hash = {};
  for(var i = 0; i < arguments.length; i = i + 2) {
    hash[arguments[i]] = arguments[i + 1];
  }
  return hash;
}

describe('chat-strategy-test', function() {
  var blockTimer = require('../../block-timer');
  before(blockTimer.on);
  after(blockTimer.off);

  var fixture = {};
  before(fixtureLoader(fixture, {
    user1: {},
    troupe1: {users: ['user1']},
    message1: {
      user: 'user1',
      troupe: 'troupe1',
      text: 'old_message',
      sent: new Date("01/01/2014")
    },
    message2: {
      user: 'user1',
      troupe: 'troupe1',
      text: 'new_message',
      sent: new Date()
    }
  }));


  after(function() {
    return fixture.cleanup();
  });

  function cleanResult(result) {
    result.id = result.id && String(result.id);
    var withoutUndefined = _.pairs(result).filter(function(pair) {
      return (pair[1] !== undefined);
    }).map(function(pair) {
      if (pair[1] && pair[1]._bsontype) {
        pair[1] = String(pair[1]);
      }
      return pair;
    });

    return _.zipObject(withoutUndefined);
  }

  function cleanMap(result) {
    var cleanedValues = _.pairs(result).map(function(pair) {
      return [pair[0], cleanResult(pair[1])];
    });

    return _.zipObject(cleanedValues);
  }

  function cleanChat(chat) {
    var a = cleanResult(chat);
    a.fromUser = a.fromUser && cleanResult(a.fromUser);
    return a;
  }

  it('should serialize a message', function() {
    var strategy = new ChatStrategy();
    return serialize([fixture.message1], strategy)
      .then(function(s) {
        assert.deepEqual(s.map(cleanChat), [{
          id: fixture.message1.id,
          text: 'old_message',
          sent: '2014-01-01T00:00:00.000Z',
          fromUser:
           { id: fixture.user1.id,
             username: fixture.user1.username,
             displayName: fixture.user1.displayName,
             url: '/' + fixture.user1.username,
             avatarUrlSmall: '/api/private/user-avatar/' + fixture.user1.username + '?s=60',
             avatarUrlMedium: '/api/private/user-avatar/' + fixture.user1.username + '?s=128',
             v: 1 },
          unread: true,
          urls: [],
          mentions: [],
          issues: [],
          meta: [],
          v: 1
        }]);
      });
  });

  it('should serialize a message with lean=true', function() {
    var strategy = new ChatStrategy({ lean: true });
    return serialize([fixture.message1], strategy)
      .then(function(s) {
        assert.deepEqual(s.map(cleanChat), [{
          id: fixture.message1.id,
          text: 'old_message',
          sent: '2014-01-01T00:00:00.000Z',
          fromUser:
           { id: fixture.user1.id,
             username: fixture.user1.username,
             v: 1 },
          unread: true,
          v: 1
        }]);
      });
  });

  it('should serialize a message with lean=2', function() {
    var strategy = new ChatStrategy({ lean: 2 });
    return serialize([fixture.message1], strategy)
      .then(function(s) {
        s.items = s.items.map(cleanResult);
        s.lookups.users = cleanMap(s.lookups.users);
        assert.deepEqual(s, {
          items: [{
            id: fixture.message1.id,
            text: 'old_message',
            sent: '2014-01-01T00:00:00.000Z',
            fromUser: fixture.user1.id,
            unread: true,
            v: 1
          }],
          lookups: {
            users: makeHash(fixture.user1.id, {
              id: fixture.user1.id,
              username: fixture.user1.username,
              displayName: fixture.user1.displayName,
              url: '/' + fixture.user1.username,
              avatarUrlSmall: '/api/private/user-avatar/' + fixture.user1.username + '?s=60',
              avatarUrlMedium: '/api/private/user-avatar/' + fixture.user1.username + '?s=128',
              v: 1
            })
          }
        });
      });
  });

});
