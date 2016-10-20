"use strict"

var assert = require('assert');
var forumStore = require('../../../../server/stores/forum-store');

describe('forumStore', () => {

  var data = {};

  it('should expose a data object', () => {
    assert(forumStore(data).data);
  });

  it('should expose a getForum function', () => {
    assert(forumStore(data).getForum);
  });

  it('should expose a getForumId function', () => {
    assert(forumStore(data).getForumId);
  });

  it('should expose a getSubscriptionState function', () => {
    assert(forumStore(data).getSubscriptionState);
  });
});
