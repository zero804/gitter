"use strict";

var assert = require('assert');
var updateActiveTag = require('../../../../../browser/js/action-creators/forum/update-active-tag');
var forumTagConstants = require('../../../../../browser/js/constants/forum-tags');

describe('updateActiveTag', () => {


  it('should return the right event type', () => {
    assert.equal(updateActiveTag().type, forumTagConstants.UPDATE_ACTIVE_TAG);
  });

});
