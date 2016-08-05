"use strict";

var assert = require('assert');
var updateActiveSort = require('../../../../../browser/js/action-creators/forum/update-active-sort');
var forumSortConstants = require('../../../../../browser/js/constants/forum-sorts');

describe('updateActiveSort', () => {

  it('should provide the right event type', () => {
    assert.equal(updateActiveSort('test').type, forumSortConstants.UPDATE_ACTIVE_SORT);
  });


  it('should throw an error if no sort is provided', () => {
    try { updateActiveSort(); }
    catch(e) {
      assert.equal(e.message, 'A valid sort value must be passed to updateActiveSort');
    }
  });

  it('must provide the right sort value', () => {
    assert.equal(updateActiveSort('all').sort, 'all');
  });

});
