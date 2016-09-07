"use strict";

var assert = require('assert');
var tagStore = require('../../../../server/stores/forum-tag-store');

describe('ForumStore', () => {

  const tags = [ 'test-1', 'test-2', 'test-3' ];
  let store;

  beforeEach(() => store = tagStore(tags));

  it('should return an object with data', () => {
    assert(store.data);
  });

  it('should return a getTags function', () => {
    assert(store.getTags);
  });

  it('should return a getActiveTagName function', () => {
    assert(store.getActiveTagName);
  });


  it('should add an initial category of all', function(){
    assert.equal(store.data[0].label, 'All Tags');
  });

  it('should assign the correct default active state', () => {
    assert(store.data[0].active);
  });

  it('should assign the correct active state when a tag is passed', () => {
    store = tagStore(tags, tags[0])
    //All tags is added so the index is bumped here bu one
    assert(store.data[1].active);
  });

  it('should return an array of tags by value', () => {
    const values = [tags[0], tags[1]]
    const result = store.getTagsByValue(values);

    assert.equal(result.length, values.length);

    result.forEach((t, i) => {
      assert.equal(t.label, values[i]);
      assert(t.value);
    })
  });

  it('should return a collection of values from pluckValues', () => {
    const result = store.pluckValues();
    assert.deepEqual(result, tags);
  });

});
