"use strict";

var assert = require('assert');
var navigateToCategory = require('gitter-web-topics-ui/shared/action-creators/forum/navigate-to-category');
var navConstants = require('gitter-web-topics-ui/shared/constants/navigation');

describe('navigateToCategory', () => {

  it('should provide the right event type', () => {
    assert.equal(navigateToCategory('all').type, navConstants.NAVIGATE_TO);
  });

  it('should provde the right route value', () => {
    assert.equal(navigateToCategory('all').route, 'forum');
  });

  it('throw an error if no category is provided', (done) => {
    try { navigateToCategory() }
    catch(e) {
      assert.equal(e.message, 'navigateToCategory must be called with a category value');
      done();
    }
  });

  it('should provide the right category when specified', () => {
    assert.equal(navigateToCategory('all').category, 'all');
  });

});
