/*jslint node:true, unused:true*/
/*global describe:true, it:true */

'use strict';

var roomSort = require('../../../public/js/utils/room-sort');
var Backbone = require('../../../public/repo/backbone/backbone');
var assert = require('assert');

describe('room-sort', function() {
  describe('favourites', function() {
    it('filters out non favourites', function() {
      var collection = new Backbone.Collection([
        { id: 1, favourite: 1 },
        { id: 2 }
      ]);

      var filteredCollection = collection.filter(roomSort.favourites.filter);

      assert.deepEqual(id(filteredCollection), [1]);
    });

    it('sorts by favourite rank', function() {
      var collection = new Backbone.Collection([
        { id: 1, favourite: 3 },
        { id: 2, favourite: 1 },
        { id: 3, favourite: 2 }
      ]);

      collection.comparator = roomSort.favourites.sort;

      var filteredCollection = collection.sort();

      assert.deepEqual(id(filteredCollection), [2, 3, 1]);
    });
  });
});

function id(collection) {
  return collection.map(function(model) {
    return model.get('id');
  });
}
