"use strict";

var assert = require('assert');
var newReplyStore = require('../../../../server/stores/new-reply-store');

describe('newReplyStore', () => {

  var data = {};

  it('should an object with getNewReply', () => {
    assert(newReplyStore(data).get);
  });

});
