"use strict";

var assert = require('assert');
var topicsStore = require('../../../../server/stores/topics-store');

describe('topicsStore', () => {

  var models = [];

  it('should return an object with models', () => {
    assert(topicsStore(models).models);
  });

  it('should return an object with getTopics', () => {
    assert(topicsStore(models).getTopics);
  });

});
