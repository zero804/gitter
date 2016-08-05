"use strict";

var assert = require('assert');
var updateActiveFilter = require('../../../../../browser/js/action-creators/forum/update-active-filter');
var forumFilterConstants = require('../../../../../browser/js/constants/forum-filters');

describe('updateActiveFilter', () => {

  it('should provide the right event type', () => {
    assert.equal(updateActiveFilter('all').type, forumFilterConstants.UPDATE_ACTIVE_FILTER);
  });

  it('should throw an error if no filter is provided', () => {
    try { updateActiveFilter(); }
    catch(e) {
      assert.equal(e.message, 'A valid filter value must be passed to updateActiveFilter');
    }
  });

  it('must provide the right filter value', () => {
    assert.equal(updateActiveFilter('all').filter, 'all');
  });

});
