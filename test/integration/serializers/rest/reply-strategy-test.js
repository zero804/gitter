"use strict";

var env = require('gitter-web-env');
var nconf = env.config;
var testRequire = require('../../test-require');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assertUtils = require('../../assert-utils')
var serialize = testRequire('./serializers/serialize');
var ReplyStrategy = testRequire('./serializers/rest/reply-strategy');


function makeHash() {
  var hash = {};
  for(var i = 0; i < arguments.length; i = i + 2) {
    hash[arguments[i]] = arguments[i + 1];
  }
  return hash;
}

describe('ReplyStrategy', function() {
  var blockTimer = require('../../block-timer');
  before(blockTimer.on);
  after(blockTimer.off);

  var fixture = fixtureLoader.setup({
    user1: {},
    forum1: {},
    category1: {
      forum: 'forum1'
    },
    topic1: {
      forum: 'forum1',
      category: 'category1',
      user: 'user1',
    },
    reply1: {
      forum: 'forum1',
      category: 'category1',
      user: 'user1',
      topic: 'topic1',
      sent: new Date('2014-01-01T00:00:00.000Z')
    }
  });

  it('should serialize a reply', function() {
    var strategy = new ReplyStrategy();

    var reply = fixture.reply1;
    var user = fixture.user1;

    return serialize([reply], strategy)
      .then(function(s) {
        assertUtils.assertSerializedEqual(s, [{
          id: reply.id,
          body: {
            text: reply.text,
            html: reply.html
          },
          user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            url: '/' + user.username,
            avatarUrl:  nconf.get('avatar:officialHost') + '/g/u/' + user.username,
            avatarUrlSmall: '/api/private/user-avatar/' + user.username + '?s=60',
            avatarUrlMedium: '/api/private/user-avatar/' + user.username + '?s=128',
            staff: false,
            v: 1
          },
          sent: '2014-01-01T00:00:00.000Z',
          editedAt: null,
          lastModified: null,
          v:1
        }])
      });
  });

  it("should serialize a reply with lookups=['user']", function() {
    var strategy = new ReplyStrategy({ lookups: ['user'] });

    var reply = fixture.reply1;
    var user = fixture.user1;

    return serialize([reply], strategy)
      .then(function(s) {
        assertUtils.assertSerializedEqual(s, {
          items: [{
            id: reply.id,
            body: {
              text: reply.text,
              html: reply.html
            },
            user: fixture.user1.id,
            sent: '2014-01-01T00:00:00.000Z',
            editedAt: null,
            lastModified: null,
            v:1
          }],
          lookups: {
            users: makeHash(fixture.user1.id, {
              id: user.id,
              username: user.username,
              displayName: user.displayName,
              url: '/' + user.username,
              avatarUrl:  nconf.get('avatar:officialHost') + '/g/u/' + user.username,
              avatarUrlSmall: '/api/private/user-avatar/' + user.username + '?s=60',
              avatarUrlMedium: '/api/private/user-avatar/' + user.username + '?s=128',
              staff: false,
              v: 1
            })
          }
        })
      });
  });
});

