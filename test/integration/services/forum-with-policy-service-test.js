'use strict';

var testRequire = require('../test-require');
var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var Promise = require('bluebird');
var StatusError = require('statuserror');
var ForumWithPolicyService = testRequire('./services/forum-with-policy-service');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');


var adminPolicy = {
  canAdmin: function() {
    return Promise.resolve(true);
  },
  canWrite: function() {
    return Promise.resolve(true);
  }
};

describe('forum-with-policy-service #slow', function() {
  var fixture = fixtureLoader.setup({
    user1: {},
    forum1: {},
    category1: {
      forum: 'forum1'
    }
  });

  var forumWithPolicyService;

  before(function() {
    forumWithPolicyService = new ForumWithPolicyService(fixture.forum1, fixture.user1, adminPolicy);
  });

  it('should allow admins to create categories', function() {
    return forumWithPolicyService.createCategory({ name: 'foo' })
      .then(function(category) {
        assert.strictEqual(category.name, 'foo');
      });
  });

  it('should allow members to create topics', function() {
    return forumWithPolicyService.createTopic(fixture.category1, {
        title: 'foo',
        tags: ['cats', 'dogs'],
        sticky: true,
        text: 'This is **my** story.'
      })
      .then(function(topic) {
        assert.strictEqual(topic.title, 'foo');
        assert(mongoUtils.objectIDsEqual(topic.categoryId, fixture.category1.id));
        assert.deepEqual(topic.tags.slice(), ['cats', 'dogs']);
        assert.ok(topic.sticky);
        assert.strictEqual(topic.text, 'This is **my** story.');
        assert.strictEqual(topic.html, 'This is <strong>my</strong> story.');
      });
  });

  it('should allow members to reply to topics');
  it('should allow members to comments on topics');

});
