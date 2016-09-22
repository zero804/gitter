"use strict";

var assert = require('assert');
var newCommentStoreStore = require('../../../../server/stores/new-comment-store-store');

describe('newCommentStoreStore', () => {

  var data = {};

  it('should an object with getNewCommentStore', () => {
    assert(newCommentStoreStore(data).get);
  });

});
