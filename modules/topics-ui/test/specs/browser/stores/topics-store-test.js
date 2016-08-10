"use strict";

var assert = require('assert');
var Store = require('../../../../browser/js/stores/topics-store.js');

describe('TopicsStore', () => {

  let store;
  beforeEach(() => {
    store = new Store();
  });

  it('should provide a getTopics()', () => {
    assert(store.getTopics);
  });

});
