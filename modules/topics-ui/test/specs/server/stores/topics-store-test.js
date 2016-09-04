"use strict";

var assert = require('assert');
var topicsStore = require('../../../../server/stores/topics-store');

describe('topicsStore', () => {

  var models = [
    { id: 1 },
    { id: 2 }
  ];

  it('should return an object with data', () => {
    assert(topicsStore(models).data);
  });

  it('should return an object with getTopics', () => {
    assert(topicsStore(models).getTopics);
  });

  it('should get a model by id', () => {
    assert.equal(topicsStore(models).getById(1), models[0]);
  });

});
