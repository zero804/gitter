'use strict';
var path = require('path');
var assert = require('assert');

var _ = require('underscore');
var Backbone = require('backbone');

// This is weird and based off of the `test-require` -> `path.resolve(__dirname + '/../../server/' + module)`
var keyboardControllerRequireBasePath = '../public/js/views/menu/room/keyboard-controller/';

var sanitizeDir = require('../test-require')(path.join(keyboardControllerRequireBasePath, 'sanitize-direction'));
var findNextActiveItem = require('../test-require')(path.join(keyboardControllerRequireBasePath, 'find-next-active-item'));
var findNextNavigableModel = require('../test-require')(path.join(keyboardControllerRequireBasePath, 'find-next-navigable-model'));


// Only compares the keys of the expected
var assertExpectedOnlyDeep = function(actual, expected) {
  Object.keys(expected).forEach(function(key) {
    assert.strictEqual(actual[key], expected[key]);
  });
};




var FORWARDS = sanitizeDir.FORWARDS;
var BACKWARDS = sanitizeDir.BACKWARDS;


var activeCollectionFixtureData1 = [
  { name: 'foo1-1' },
  { name: 'bar1-2' },
  { name: 'baz1-3' },
  { name: 'qux1-4' },
  { name: 'gar1-5' },
  { name: 'wal1-6' }
];

var activeCollectionFixtureData2 = [
  { name: 'hot2-1' },
  { name: 'cro2-2' },
  { name: 'bun2-3' },
  { name: 'thr2-4' },
  { name: 'bli2-5' },
  { name: 'mic2-6' }
];


var ActiveModel = Backbone.Model.extend({
  defaults: {
    name: '',
    active: false,
    isHidden: false
  }
});

var ActiveCollection = Backbone.Collection.extend({
  model: ActiveModel
});

var activeCollectionFixture1 = new ActiveCollection(activeCollectionFixtureData1);
var activeCollectionFixture2 = new ActiveCollection(activeCollectionFixtureData2);

var basicNavigableCollectionListFixture = [
  { collection: activeCollectionFixture1 },
];

var mediumNavigableCollectionListFixture = [
  { collection: activeCollectionFixture1 },
  { collection: activeCollectionFixture2 }
];

var templateNavigableItemReference = {
  mapKey: 'test',
  listIndex: null,
  modelId: null,
  modelIndex: null
};


describe('Keyboard Controller', function() {

  describe('sanitize-direction', function() {
    it('Resolves boolean `true` as forwards', function() {
      assert.strictEqual(sanitizeDir(true), FORWARDS);
    });
    it('Resolves boolean `false` as backwards', function() {
      assert.strictEqual(sanitizeDir(false), BACKWARDS);
    });
    it('Resolves number `1` as forwards', function() {
      assert.strictEqual(sanitizeDir(1), FORWARDS);
    });
    it('Resolves number `-1` as backwards', function() {
      assert.strictEqual(sanitizeDir(-1), BACKWARDS);
    });
    it('Resolves number `0` as forwards', function() {
      assert.strictEqual(sanitizeDir(0), FORWARDS);
    });
    it('Resolves number `4` as forwards', function() {
      assert.strictEqual(sanitizeDir(4), FORWARDS);
    });
    it('Resolves number `-4` as backwards', function() {
      assert.strictEqual(sanitizeDir(-4), BACKWARDS);
    });
    it('Resolves `undefined` as forwards', function() {
      assert.strictEqual(sanitizeDir(undefined), FORWARDS);
    });
    it('Resolves `null` as forwards', function() {
      assert.strictEqual(sanitizeDir(null), FORWARDS);
    });
  });


  describe('find-next-active-item', function() {
    var basicListFixture = [1, 2, 3];
    var mediumListFixture = [1, 2, 3, 4, 5, 6];

    it('Resolves to first item starting at the beginning(null) and going forwards', function() {
      var nextItem = findNextActiveItem(basicListFixture, null, FORWARDS);
      assert.deepEqual(nextItem, {
        item: 1,
        index: 0
      });
    });
    it('Resolves to last item starting at the beginning(null) and going backwards', function() {
      var nextItem = findNextActiveItem(basicListFixture, null, BACKWARDS);
      assert.deepEqual(nextItem, {
        item: 3,
        index: 2
      });
    });
    it('Resolves to next item starting at the first index', function() {
      var nextItem = findNextActiveItem(basicListFixture, 0, FORWARDS);
      assert.deepEqual(nextItem, {
        item: 2,
        index: 1
      });
    });
    it('Resolves to previous item starting at the last index', function() {
      var nextItem = findNextActiveItem(basicListFixture, basicListFixture.length-1, BACKWARDS);
      assert.deepEqual(nextItem, {
        item: 2,
        index: 1
      });
    });
    it('Resolves to previous item starting in the middle', function() {
      var nextItem = findNextActiveItem(basicListFixture, 1, FORWARDS);
      assert.deepEqual(nextItem, {
        item: 3,
        index: 2
      });
    });
    it('Resolves to next item starting in the middle', function() {
      var nextItem = findNextActiveItem(basicListFixture, 1, BACKWARDS);
      assert.deepEqual(nextItem, {
        item: 1,
        index: 0
      });
    });
    it('Resolves to next item when in the middle of a list and going forwards', function() {
      var nextItem = findNextActiveItem(mediumListFixture, 2, FORWARDS);
      assert.deepEqual(nextItem, {
        item: 4,
        index: 3
      });
    });
    it('Resolves to previous item when in the middle of a list and going backwards', function() {
      var nextItem = findNextActiveItem(mediumListFixture, 2, BACKWARDS);
      assert.deepEqual(nextItem, {
        item: 2,
        index: 1
      });
    });

    it('Resolves to nothing when list is empty and going forwards', function() {
      var nextItem = findNextActiveItem([], null, FORWARDS);
      assert.strictEqual(nextItem, undefined);
    });
    it('Resolves to nothing when list is empty and going backwards', function() {
      var nextItem = findNextActiveItem([], null, BACKWARDS);
      assert.strictEqual(nextItem, undefined);
    });

    it('Resolves to nothing when nothing is active and going forwards', function() {
      var nextItem = findNextActiveItem(mediumListFixture, null, FORWARDS, function(item) {
        // nothing is active
        return false;
      });
      assert.strictEqual(nextItem, undefined);
    });
    it('Resolves to nothing when nothing is active and going backwards', function() {
      var nextItem = findNextActiveItem(mediumListFixture, null, BACKWARDS, function(item) {
        // nothing is active
        return false;
      });
      assert.strictEqual(nextItem, undefined);
    });

    it('Resolves correclty when using custom active callback and going forwards', function() {
      var nextItem = findNextActiveItem(mediumListFixture, null, FORWARDS, function(item) {
        return item === 3;
      });
      assert.deepEqual(nextItem, {
        item: 3,
        index: 2
      });
    });
    it('Resolves correclty when using custom active callback and going backwards', function() {
      var nextItem = findNextActiveItem(mediumListFixture, null, BACKWARDS, function(item) {
        return item === 3;
      });
      assert.deepEqual(nextItem, {
        item: 3,
        index: 2
      });
    });
  });


  describe('find-next-navigable-model', function() {
    var createBasicTest = function(testName, dir, referenceModelIndex, expectedIndex) {
      it(testName, function() {
        var nextResult = findNextNavigableModel(basicNavigableCollectionListFixture, _.extend({}, templateNavigableItemReference, {
          listIndex: 0,
          modelIndex: referenceModelIndex
        }), dir);

        console.log('nextResult', nextResult);
        assert.ok(nextResult);
        assert.strictEqual(nextResult.model.get('name'), activeCollectionFixture1.at(expectedIndex).get('name'));
        assertExpectedOnlyDeep(nextResult.reference, {
          listIndex: 0,
          modelIndex: expectedIndex
        });
      });
    };

    createBasicTest('Find first item when starting from nothing moving forward', FORWARDS, null, 0);
    createBasicTest('Find last item when starting from nothing moving backward', BACKWARDS, null, activeCollectionFixture1.length-1);

    createBasicTest('Find next item when starting in middle moving forward', FORWARDS, 2, 3);
    createBasicTest('Find next item when starting in middle moving backward', BACKWARDS, 2, 1);

    createBasicTest('Find first item when starting last moving forward', FORWARDS, activeCollectionFixture1.length-1, 0);

  });

});
