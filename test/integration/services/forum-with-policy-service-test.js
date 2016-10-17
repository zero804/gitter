'use strict';

var testRequire = require('../test-require');
var assert = require('assert');
var StatusError = require('statuserror');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var Promise = require('bluebird');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');

describe('forum-with-policy-service #slow', function() {
  var fixture = fixtureLoader.setup({
    // user1 is a fake member that added the things below
    user1: {},
    // user2 is a different fake member
    user2: {},
    // user3 is a fake admin
    user3: {},
    // user4 is a normal user that's not a member of the forum
    user4: {},
    forum1: {
      tags: ['cats', 'dogs']
    },
    category1: {
      forum: 'forum1'
    },
    // this one is for changing the category
    category2: {
      forum: 'forum1'
    },
    // this one for testing admin-only categories (posting new topics to it or
    // changing an existing topic's category)
    category3: {
      forum: 'forum1',
      adminOnly: true
    },
    topic1: {
      user: 'user1',
      forum: 'forum1',
      category: 'category1'
    },
    topic2: {
      user: 'user1',
      forum: 'forum1',
      category: 'category1'
    },
    reply1: {
      user: 'user1',
      forum: 'forum1',
      category: 'category1',
      topic: 'topic1'
    },
    comment1: {
      user: 'user1',
      forum: 'forum1',
      category: 'category1',
      topic: 'topic1',
      reply: 'reply1'
    }
  });

  var ForumWithPolicyService = testRequire.withProxies('./services/forum-with-policy-service', {
    'gitter-web-topics/lib/forum-service': {
      setForumTags: function() {}
    },
    'gitter-web-topics/lib/forum-category-service': {
      createCategory: function() {},
      updateCategory: function() {},
      deleteCategory: function() {}
    },
    'gitter-web-topics/lib/topic-service': {
      createTopic: function() {},
      updateTopic: function() {},
      setTopicTags: function() {},
      setTopicSticky: function() {},
      setTopicCategory: function() {},
      deleteTopic: function() {}
    },
    'gitter-web-topics/lib/reply-service': {
      createReply: function() {},
      updateReply: function() {},
      deleteReply: function() {}
    },
    'gitter-web-topics/lib/comment-service': {
      createComment: function() {},
      updateComment: function() {},
      deleteComment: function() {}
    },
    'gitter-web-topic-notifications/lib/subscriber-service': {
      listForItem: function() {},
      addSubscriber: function() {},
      removeSubscriber: function() {}
    }
  });


  var services;

  before(function() {
    services = {
      owner: new ForumWithPolicyService(fixture.forum1, fixture.user1, {
        canAdmin: function() {
          return Promise.resolve(false);
        },
        canWrite: function() {
          return Promise.resolve(true);
        },
        canRead: function() {
          return Promise.resolve(true);
        }
      }),
      member: new ForumWithPolicyService(fixture.forum1, fixture.user2, {
        canAdmin: function() {
          return Promise.resolve(false);
        },
        canWrite: function() {
          return Promise.resolve(true);
        },
        canRead: function() {
          return Promise.resolve(true);
        }
      }),
      admin: new ForumWithPolicyService(fixture.forum1, fixture.user3, {
        canAdmin: function() {
          return Promise.resolve(true);
        },
        canWrite: function() {
          return Promise.resolve(true);
        },
        canRead: function() {
          return Promise.resolve(true);
        }
      }),
      other: new ForumWithPolicyService(fixture.forum1, fixture.user4, {
        canAdmin: function() {
          return Promise.resolve(false);
        },
        canWrite: function() {
          return Promise.resolve(false);
        },
        canRead: function() {
          return Promise.resolve(true);
        }
      })
    };
  });

  function makeCheck(type, method, getParams, expectedResult, note) {
    var shouldOrNot = (expectedResult) ? ' should' : ' should not';
    var description = type + ' users' + shouldOrNot + ' be allowed to ' + method;
    if (note) description = description + ' (' + note + ')';

    it(description, function() {
      var expected = !!expectedResult;

      // These things have to be looked up when this function gets executed
      // because otherwise the fixture isn't set up yet.
      var forumWithPolicyService = services[type];
      var params = getParams();

      return forumWithPolicyService[method].apply(forumWithPolicyService, params)
        .then(function() {
          assert.strictEqual(expected, true);
        })
        .catch(StatusError, function(err) {
          assert.strictEqual(err.status, 403);
          assert.strictEqual(expected, false);
        });
    });
  }

  function makeChecks(method, params, expectedResults, note) {
    // * true means the user must be allowed to do it
    // * undefined means the user must not be allowed (403 error)
    // * false means skip this test because it is not applicable (ie. "owning
    //   user" makes no sense for creating things)

    if (expectedResults.owner !== false) {
      makeCheck('owner', method, params, !!expectedResults.owner, note);
    }

    if (expectedResults.member !== false) {
      makeCheck('member', method, params, !!expectedResults.member, note);
    }

    if (expectedResults.admin !== false) {
      makeCheck('admin', method, params, !!expectedResults.admin, note);
    }

    if (expectedResults.other !== false) {
      makeCheck('other', method, params, !!expectedResults.other, note);
    }
  }

  makeChecks('createCategory', function() { return [{}]; }, {
    admin: true,
    owner: false // skip
  });

  makeChecks('createTopic', function() { return [fixture.category1, {}]; }, {
    admin: true,
    owner: false, // skip
    member: true
  }, 'normal category');

  makeChecks('createTopic', function() { return [fixture.category3, {}]; }, {
    admin: true,
    owner: false, // skip
  }, 'adminOnly category');

  makeChecks('createReply', function() { return [fixture.topic1, {}]; }, {
    admin: true,
    owner: false, // skip
    member: true
  });

  makeChecks('createComment', function() { return [fixture.reply1, {}]; }, {
    admin: true,
    owner: false, // skip
    member: true
  });

  makeChecks('setForumTags', function() { return [[]]; }, {
    admin: true,
    owner: false, // skip
  });

  makeChecks('updateTopic', function() { return [fixture.topic1, {}]; }, {
    admin: true,
    owner: true
  });

  makeChecks('setTopicTags', function() { return [fixture.topic1, []]; }, {
    admin: true,
    owner: true
  });

  makeChecks('setTopicSticky', function() { return [fixture.topic1, 1]; }, {
    admin: true,
  });

  makeChecks('setTopicCategory', function() { return [fixture.topic1, fixture.category2]; }, {
    admin: true,
    owner: true
  }, 'normal category');

  makeChecks('setTopicCategory', function() { return [fixture.topic1, fixture.category3]; }, {
    admin: true,
  }, 'adminOnly category');

  makeChecks('updateReply', function() { return [fixture.reply1, {}]; }, {
    admin: true,
    owner: true
  });

  makeChecks('updateComment', function() { return [fixture.comment1, {}]; }, {
    admin: true,
    owner: true
  });

  makeChecks('updateCategory', function() { return [fixture.category1, {}]; }, {
    admin: true,
    owner: false // skip
  });

  makeChecks('deleteTopic', function() { return [fixture.topic1]; }, {
    admin: true,
    owner: true
  });

  makeChecks('deleteReply', function() { return [fixture.reply1]; }, {
    admin: true,
    owner: true
  });

  makeChecks('deleteComment', function() { return [fixture.comment1]; }, {
    admin: true,
    owner: true
  });

  makeChecks('deleteCategory', function() { return [fixture.category1]; }, {
    admin: true,
    owner: false // skip
  });

  makeChecks('listSubscribers', function() { return [{forumId: fixture.forum1.id}, {}]; }, {
    admin: true,
    owner: false, // skip
  });

  makeChecks('subscribe', function() { return [{forumId: fixture.forum1.id}, {}]; }, {
    admin: true,
    owner: false, // skip
    member: true,
    other: true
  });

  makeChecks('unsubscribe', function() { return [{forumId: fixture.forum1.id}, {}]; }, {
    admin: true,
    owner: false, // skip
    member: true,
    other: true
  });

});
