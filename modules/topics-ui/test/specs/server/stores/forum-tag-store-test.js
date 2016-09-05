"use strict";

var assert = require('assert');
var tagStore = require('../../../../server/stores/forum-tag-store');

describe('ForumStore', () => {

  const tags = [ 1, 2, 3];
  const parsedTags = [
    {value: 'all-values', label: 'All values', active: true },
    {value: 1, label: 1, active: false },
    {value: 2, label: 2, active: false },
    {value: 3, label: 3, active: false },
  ];

  it('should return an object with data', () => {
    assert(tagStore().data);
  });

  it('should return the payload its proved with', () => {
    assert.equal(tagStore(tags, 1).data.length, parsedTags.length);
  });

  it('should add an initial category of all', function(){
    assert.equal(tagStore(tags).data[0].label, 'All Tags');
  });

  it('should assign the correct default active state', () => {
    assert(tagStore(tags).data[0].active);
  });

  it('should assign the correct active state when a tag is passed', () => {
    assert(tagStore(tags, 1).data[1].active);
  });

  it('should return the same from data and getTags', () => {
    const store = tagStore(tags, 1);
    assert.deepEqual(store.getTags(), store.data);
  });

});
