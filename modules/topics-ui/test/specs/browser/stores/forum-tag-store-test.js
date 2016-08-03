"use strict";

var assert = require('assert');
var ForumTagStore = require('../../../../browser/js/stores/forum-tag-store');

describe('TagStore', () => {

  var tags;
  var tagStore;

  beforeEach(function(){
    tags = [
      {tag: 'all-tags', name: 'All Tags', active: true },
      {tag: 1, name: 1, active: false },
      {tag: 2, name: 2, active: false },
      {tag: 3, name: 3, active: false },
    ];
    tagStore = new ForumTagStore(tags);
  });

  it('dummy test', () => {
    assert(true);
  });

});
