"use strict";

var assert = require('assert');
var commentsStore = require('../../../../server/stores/comments-store');

describe('commentsStore', () => {

  var models = [];

  it('should return an object with models', () => {
    assert(commentsStore(models).models);
  });

  it('should return an object with getComments', () => {
    assert(commentsStore(models).getComments);
  });

});
