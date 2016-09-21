"use strict";

var env = require('gitter-web-env');
var nconf = env.config;
var testRequire = require('../../test-require');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assertUtils = require('../../assert-utils')
var serialize = testRequire('./serializers/serialize');
var serializeObject = testRequire('./serializers/serialize-object');
var ForumStrategy = testRequire('./serializers/rest/forum-strategy');
var subscriberService = require('gitter-web-topic-notifications/lib/subscriber-service');
var ForumObject = require('gitter-web-topic-notifications/lib/forum-object');
var assert = require('assert');

var LONG_AGO = '2014-01-01T00:00:00.000Z';

describe('ForumStrategy #slow', function() {
  var blockTimer = require('../../block-timer');
  before(blockTimer.on);
  after(blockTimer.off);

  var fixture = fixtureLoader.setup({
    user1: {},
    forum1: {},
    category1: {
      forum: 'forum1',
    },
    category2: {
      forum: 'forum1',
      order: 2
    },
    category3: {
      forum: 'forum1',
      order: 1
    },
    topic1: {
      user: 'user1',
      forum: 'forum1',
      category: 'category1',
      sent: new Date(LONG_AGO)
    }
  });

  it('should serialize a forum', function() {
    var strategy = ForumStrategy.nested();

    var user = fixture.user1;
    var forum = fixture.forum1;
    var category1 = fixture.category1;
    var category2 = fixture.category2;
    var category3 = fixture.category3;
    var topic = fixture.topic1;

    return serialize([forum], strategy)
      .then(function(s) {
        assertUtils.assertSerializedEqual(s, [{
          id: forum.id,
          tags: [],
          categories: [{
            id: category3.id,
            name: category3.name,
            slug: category3.slug,
          }, {
            id: category2.id,
            name: category2.name,
            slug: category2.slug,
          }, {
            id: category1.id,
            name: category1.name,
            slug: category1.slug,
          }],
          topics: [{
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
              id: category1.id,
              name: category1.name,
              slug: category1.slug
            },
            user: {
              id: user.id,
              username: user.username,
              displayName: user.displayName,
              avatarUrl:  nconf.get('avatar:officialHost') + '/g/u/' + user.username,
            },
            subscribed: false,
            repliesTotal: 0,
            replyingUsers: [],
            sent: LONG_AGO,
            editedAt: null,
            lastChanged: LONG_AGO,
            lastModified: LONG_AGO,
            v: 1
          }],
          subscribed: false,
          topicsTotal: 1
        }])
      });
  });

  it('should tell a user when they are subscribed to a forum', function() {
    var forumObject = ForumObject.createForForum(fixture.forum1._id);
    var userId = fixture.user1._id;

    return subscriberService.addSubscriber(forumObject, userId)
      .then(function() {
        var strategy = ForumStrategy.nested({
          currentUserId: userId
        });

        return serializeObject(fixture.forum1, strategy);
      })
      .then(function(serialized) {
        assert.strictEqual(serialized.subscribed, true);
      })
  });

  it('should tell a user when they are subscribed to a topic within a forum', function() {
    var forumObject = ForumObject.createForTopic(fixture.forum1._id, fixture.topic1._id);
    var userId = fixture.user1._id;

    return subscriberService.addSubscriber(forumObject, userId)
      .then(function() {
        var strategy = ForumStrategy.nested({
          currentUserId: userId
        });

        return serializeObject(fixture.forum1, strategy);
      })
      .then(function(serialized) {
        assert.strictEqual(serialized.topics[0].subscribed, true);
      })
  });

});
