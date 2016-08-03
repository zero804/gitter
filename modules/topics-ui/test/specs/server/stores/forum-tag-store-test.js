"use strict";

var assert = require('assert');
var tagStore = require('../../../../server/stores/forum-tag-store');

describe.only('ForumStore', () => {

  const tags = [ 1, 2, 3];
  const parsedTags = [
    {value: 'all-values', name: 'All values', active: true },
    {value: 1, name: 1, active: false },
    {value: 2, name: 2, active: false },
    {value: 3, name: 3, active: false },
  ];

  it('should return an object with models', () => {
    assert(tagStore().models);
  });

  it('should return the payload its proved with', () => {
    assert.equal(tagStore(tags, 1).models.length, parsedTags.length);
  });

  it('should add an initial category of all', function(){
    assert.equal(tagStore(tags).models[0].name, 'All Tags');
  });

  it('should assign the correct default active state', () => {
    assert(tagStore(tags).models[0].active);
  });

  it('should assign the correct active state when a tag is passed', () => {
    assert(tagStore(tags, 1).models[1].active);
  });

  it('should return the same from models and getTags', () => {
    const store = tagStore(tags, 1);
    assert.deepEqual(store.getTags(), store.models);
  });

});
