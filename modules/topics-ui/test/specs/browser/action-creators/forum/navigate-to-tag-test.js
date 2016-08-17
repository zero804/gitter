"use strict";


var assert = require('assert');
var navigateToTag = require('../../../../../browser/js/action-creators/forum/navigate-to-tag');
var forumTagConstants = require('../../../../../browser/js/constants/forum-tags');

describe('navigateToTag', () => {

  it('should throw an error if no tag is provided', (done) => {
    try{ navigateToTag() }
    catch(e){
      assert.equal(e.message, 'navigateToTag must be called with a valid tag');
      done();
    }
  });

  it('should provide the right event type', () => {
    assert.equal(navigateToTag('all').type, forumTagConstants.NAVIGATE_TO_TAG);
  });

  it('should provide the right route value', () => {
    assert.equal(navigateToTag('all').route, 'forum');
  });

  it('should provide the right tag value', () => {
    assert.equal(navigateToTag('all').tag, 'all');
  });

});
