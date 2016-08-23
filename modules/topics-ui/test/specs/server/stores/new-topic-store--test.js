"use strict";

var assert = require('assert');
var newTopicStore = require('../../../../server/stores/new-topic-store');

describe('newTopicStore', () => {

  var data = {};

  it('should an object with getNewTopic', () => {
    assert(newTopicStore(data).get);
  });

});
