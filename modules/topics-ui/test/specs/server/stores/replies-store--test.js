"use strict";

var assert = require('assert');
var repliesStore = require('../../../../server/stores/replies-store');

describe('repliesStore', () => {

  var models = [];

  it('should return an object with models', () => {
    assert(repliesStore(models).data);
  });

  it('should return an object with getReplies', () => {
    assert(repliesStore(models).getReplies);
  });

});
