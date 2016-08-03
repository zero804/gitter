"use strict";

var assert = require('assert');
var tagStore = require('../../../../server/stores/forum-tag-store');

describe.only('ForumStore', () => {

  const tags = [ 1, 2, 3];
  const parsedTags = [
    {tag: 1, active: true },
    {tag: 2, active: false },
    {tag: 3, active: false },
  ];

  it('should return an object with models', () => {
    assert(tagStore().models);
  });

  it('should return the payload its proved with', () => {
    assert.deepEqual(tagStore(tags, 1).models, parsedTags);
  });

});
