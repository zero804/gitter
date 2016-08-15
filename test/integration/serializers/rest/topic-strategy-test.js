"use strict";

var env = require('gitter-web-env');
var nconf = env.config;
var testRequire = require('../../test-require');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assertUtils = require('../../assert-utils')
var serialize = testRequire('./serializers/serialize');
var TopicStrategy = testRequire('./serializers/rest/topic-strategy');


// TODO: move this somewhere reusable otherwise we'll end up with it
// copy/pasted everywhere
function makeHash() {
  var hash = {};
  for(var i = 0; i < arguments.length; i = i + 2) {
    hash[arguments[i]] = arguments[i + 1];
  }
  return hash;
}


describe('TopicStrategy', function() {
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
      sent: new Date('2014-01-01T00:00:00.000Z')
    }
  });

  it('should serialize a topic', function() {
    var strategy = new TopicStrategy();

    var topic = fixture.topic1;
    var category = fixture.category1;
    var user = fixture.user1;

    return serialize([topic], strategy)
      .then(function(s) {
        assertUtils.assertSerializedEqual(s, [{
          id: topic.id,
          title: topic.title,
          slug: topic.slug,
          body: {
            text: topic.text,
            html: topic.html
          },
          sticky: topic.sticky,
          tags: [],
          category: {
            id: category.id,
            name: category.name,
            slug: category.slug
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

  it("should serialize a topic with lookups=['user']", function() {
    var strategy = new TopicStrategy({ lookups: ['user'] });

    var topic = fixture.topic1;
    var category = fixture.category1;
    var user = fixture.user1;

    return serialize([topic], strategy)
      .then(function(s) {
        assertUtils.assertSerializedEqual(s, {
          items: [{
            id: topic.id,
            title: topic.title,
            slug: topic.slug,
            body: {
              text: topic.text,
              html: topic.html,
            },
            sticky: topic.sticky,
            tags: [],
            category: {
              id: category.id,
              name: category.name,
              slug: category.slug
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

  it("should serialize a topic with lookups=['category']", function() {
    var strategy = new TopicStrategy({ lookups: ['category'] });

    var topic = fixture.topic1;
    var category = fixture.category1;
    var user = fixture.user1;

    return serialize([topic], strategy)
      .then(function(s) {
        assertUtils.assertSerializedEqual(s, {
          items: [{
            id: topic.id,
            title: topic.title,
            slug: topic.slug,
            body: {
              text: topic.text,
              html: topic.html
            },
            sticky: topic.sticky,
            tags: [],
            category: fixture.category1.id,
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
          }],
          lookups: {
            categories: makeHash(fixture.category1.id, {
              id: category.id,
              name: category.name,
              slug: category.slug
            })
          }
        })
      });
  });
});

