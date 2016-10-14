"use strict";

var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var Strategy = require('../lib/notifications/aggregated-comment-strategy');
var assertStringifiedEqual = require('./assert-stringified-equal');

describe('aggregated-comment-strategy', function() {

  var fixture = fixtureLoader.setup({
    user: {},
    forum: {},
    category: {
      forum: 'forum',
    },
    topic: {
      user: 'user',
      forum: 'forum',
      category: 'category',
      sent: new Date('2014-01-01T00:00:00.000Z')
    },
    reply: {
      forum: 'forum',
      category: 'category',
      user: 'user',
      topic: 'topic',
      sent: new Date('2014-02-01T00:00:00.000Z')
    },
    comment1: {
      forum: 'forum',
      user: 'user',
      topic: 'topic',
      reply: 'reply',
      sent: new Date('2014-03-01T00:00:00.000Z')
    }
  });

  it('serializes correctly', function () {
    var strategy = new Strategy();
    var user = fixture.user;
    var forum = fixture.forum;
    var topic = fixture.topic;
    var reply = fixture.reply;
    var comment = fixture.comment;

    var result = strategy.map(reply, user, comment, topic, forum);

    assert.equal(result.user.id, user._id);
    // dont bother testing the user serializer, just check that the user is there
    delete result.user;

    assertStringifiedEqual(result, {
      id: reply._id,
      body: {},
      sent: "2014-02-01T00:00:00.000Z",
      editedAt: null,
      uri: forum.uri + "/topic/" + topic._id + "/" + topic.slug
    });
  });

});
