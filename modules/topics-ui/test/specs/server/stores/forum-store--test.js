"use strict"

var assert = require('assert');
var forumStore = require('../../../../server/stores/forum-store');

describe.skip('forumStore', () => {

  var data = {};

  it('should an object with getForum', () => {
    assert(forumStore(data).get);
  });

});
