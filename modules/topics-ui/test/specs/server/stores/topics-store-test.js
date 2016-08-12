"use strict";

var assert = require('assert');
var topicsStore = require('../../../../server/stores/topics-store');

describe.only('topicsStore', () => {

  var models = [
    { id: 1 },
    { id: 2 }
  ];

  it('should return an object with models', () => {
    assert(topicsStore(models).models);
  });

  it('should return an object with getTopics', () => {
    assert(topicsStore(models).getTopics);
  });

  it('should get a model by id', () => {
    assert(topicsStore(models).getById(1), models[0]);
  });

});
