'use strict';
var path = require('path');
var assert = require('assert');

// This is weird and based off of the `test-require` -> `path.resolve(__dirname + '/../../server/' + module)`
var keyboardControllerRequireBasePath = '../public/js/views/menu/room/keyboard-controller/';

var sanitizeDir = require('../test-require')(path.join(keyboardControllerRequireBasePath, 'sanitize-direction'));
var findNextActiveItem = require('../test-require')(path.join(keyboardControllerRequireBasePath, 'find-next-active-item'));

var FORWARDS = 1;
var BACKWARDS = -1;

var orgListFixture = [
  {
    id: '1',
    name: 'gitterHQ',
    isOrg: true,
    temp: false,
  },
  {
    id: '2',
    name: 'w3c',
    isOrg: true,
    temp: false,
  }
];


describe('Keyboard Controller', function() {

    describe('sanitize-direction', function() {
    it('Resolves boolean `true` as forwards', function() {
      assert.equal(sanitizeDir(true), FORWARDS);
    });
    it('Resolves boolean `false` as backwards', function() {
      assert.equal(sanitizeDir(false), BACKWARDS);
    });
    it('Resolves number `1` as forwards', function() {
      assert.equal(sanitizeDir(1), FORWARDS);
    });
    it('Resolves number `-1` as backwards', function() {
      assert.equal(sanitizeDir(-1), BACKWARDS);
    });
    it('Resolves number `0` as forwards', function() {
      assert.equal(sanitizeDir(0), FORWARDS);
    });
    it('Resolves number `4` as forwards', function() {
      assert.equal(sanitizeDir(4), FORWARDS);
    });
    it('Resolves number `-4` as backwards', function() {
      assert.equal(sanitizeDir(-4), BACKWARDS);
    });
    it('Resolves `undefined` as forwards', function() {
      assert.equal(sanitizeDir(undefined), FORWARDS);
    });
    it('Resolves `null` as forwards', function() {
      assert.equal(sanitizeDir(null), FORWARDS);
    });
  });


  describe('find-next-active-item', function() {
    var basicListFixture = [1, 2, 3];
    var mediumListFixture = [1, 2, 3, 4, 5, 6];

    it('Resolves to first item starting at the beginning(null) and going forwards', function() {
      var nextItem = findNextActiveItem(basicListFixture, null, FORWARDS);
      assert.equal(nextItem, 1);
    });
    it('Resolves to last item starting at the beginning(null) and going backwards', function() {
      var nextItem = findNextActiveItem(basicListFixture, null, BACKWARDS);
      assert.equal(nextItem, 3);
    });
    it('Resolves to next item starting at the first index', function() {
      var nextItem = findNextActiveItem(basicListFixture, 0, FORWARDS);
      assert.equal(nextItem, 2);
    });
    it('Resolves to previous item starting at the last index', function() {
      var nextItem = findNextActiveItem(basicListFixture, basicListFixture.length-1, BACKWARDS);
      assert.equal(nextItem, 2);
    });
    it('Resolves to previous item starting in the middle', function() {
      var nextItem = findNextActiveItem(basicListFixture, 1, FORWARDS);
      assert.equal(nextItem, 3);
    });
    it('Resolves to next item starting in the middle', function() {
      var nextItem = findNextActiveItem(basicListFixture, 1, BACKWARDS);
      assert.equal(nextItem, 1);
    });
    it('Resolves to next item when in the middle of a list and going forwards', function() {
      var nextItem = findNextActiveItem(mediumListFixture, 2, FORWARDS);
      assert.equal(nextItem, 4);
    });
    it('Resolves to previous item when in the middle of a list and going backwards', function() {
      var nextItem = findNextActiveItem(mediumListFixture, 2, BACKWARDS);
      assert.equal(nextItem, 2);
    });

    it('Resolves to nothing when list is empty and going forwards', function() {
      var nextItem = findNextActiveItem([], null, FORWARDS);
      assert.equal(nextItem, undefined);
    });
    it('Resolves to nothing when list is empty and going backwards', function() {
      var nextItem = findNextActiveItem([], null, BACKWARDS);
      assert.equal(nextItem, undefined);
    });

    it('Resolves to nothing when nothing is active and going forwards', function() {
      var nextItem = findNextActiveItem(mediumListFixture, null, FORWARDS, function(item) {
        // nothing is active
        return false;
      });
      assert.equal(nextItem, undefined);
    });
    it('Resolves to nothing when nothing is active and going backwards', function() {
      var nextItem = findNextActiveItem(mediumListFixture, null, BACKWARDS, function(item) {
        // nothing is active
        return false;
      });
      assert.equal(nextItem, undefined);
    });

    it('Resolves correclty when using custom active callback and going forwards', function() {
      var nextItem = findNextActiveItem(mediumListFixture, null, FORWARDS, function(item) {
        return item === 3;
      });
      assert.equal(nextItem, 3);
    });
    it('Resolves correclty when using custom active callback and going backwards', function() {
      var nextItem = findNextActiveItem(mediumListFixture, null, BACKWARDS, function(item) {
        return item === 3;
      });
      assert.equal(nextItem, 3);
    });
  });

});
