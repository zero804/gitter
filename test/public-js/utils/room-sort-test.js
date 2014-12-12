/*jslint node:true, unused:true*/
/*global describe:true, it:true */

'use strict';

var roomSort = require('../../../public/js/utils/room-sort');
var Backbone = require('../../../public/repo/backbone/backbone');
var assert = require('assert');

var OLD = new Date('1985-10-29T12:00:20.250Z');
var NEW = new Date('2014-10-29T12:00:20.250Z');

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

  describe('recents', function() {
    it.skip('filters out favourites', function() {
      var collection = new Backbone.Collection([
        { id: 1, favourite: 1 },
        { id: 2 }
      ]);

      var filteredCollection = collection.filter(roomSort.recents.filter);

      assert.deepEqual(id(filteredCollection), [2]);
    });

    describe('sort', function() {

      var RecentsCollection = Backbone.Collection.extend({ comparator: roomSort.recents.sort });

      describe('@mentions', function() {

        it('puts them above unread rooms', function() {
          var collection = new RecentsCollection([
            { id: 'unread', unreadItems: 2 },
            { id: 'mentioned', unreadItems: 1, mentions: 1 }
          ]);

          collection.sort();

          assert.deepEqual(id(collection), ['mentioned', 'unread']);
        });

        it('sorts multiple @mentioned rooms by time of last access', function() {
          var collection = new RecentsCollection([
            { id: 'old_mentions', unreadItems: 3, mentions: 5, lastAccessTime: OLD },
            { id: 'new_mentions', unreadItems: 5, mentions: 3, lastAccessTime: NEW }
          ]);

          collection.sort();

          assert.deepEqual(id(collection), ['new_mentions', 'old_mentions']);
        });

        it.skip('puts @mentioned rooms that havent been accessed at the bottom', function() {
          var collection = new RecentsCollection([
            { id: 'never_accessed_mentions', unreadItems: 1, mentions: 1 },
            { id: 'accessed_mentions', unreadItems: 1, mentions: 1, lastAccessTime: NEW }
          ]);

          collection.sort();

          assert.deepEqual(id(collection), ['accessed_mentions', 'never_accessed_mentions']);
        });

        it.skip('doesnt move rooms once they have been accessed', function() {});
        it.skip('doesnt move rooms once they have been read', function() {});
      });

      describe('unread', function() {
        it('puts them above regular rooms', function() {
          var collection = new RecentsCollection([
            { id: 'regular' },
            { id: 'unread', unreadItems: 1 }
          ]);

          collection.sort();

          assert.deepEqual(id(collection), ['unread', 'regular']);
        });

        it('sorts multiple unread rooms by time of last access', function() {
          var collection = new RecentsCollection([
            { id: 'old_unread', unreadItems: 5, lastAccessTime: OLD },
            { id: 'new_unread', unreadItems: 1, lastAccessTime: NEW }
          ]);

          collection.sort();

          assert.deepEqual(id(collection), ['new_unread', 'old_unread']);
        });

        it.skip('puts unread rooms that havent been accessed at the bottom', function() {
          var collection = new RecentsCollection([
            { id: 'never_accessed_unread', unreadItems: 2 },
            { id: 'accessed_unread', unreadItems: 1, lastAccessTime: NEW }
          ]);

          collection.sort();

          assert.deepEqual(id(collection), ['accessed_unread', 'never_accessed_unread']);
        });
        it.skip('doesnt move rooms once they have been accessed', function() {});
        it.skip('doesnt move rooms once they have been read', function() {});
      });

      describe('regular', function() {
        it('sorts multiple rooms by time of last access', function() {
          var collection = new RecentsCollection([
            { id: 'old_room', lastAccessTime: OLD },
            { id: 'new_room', lastAccessTime: NEW }
          ]);

          collection.sort();

          assert.deepEqual(id(collection), ['new_room', 'old_room']);
        });

        it('puts rooms that havent been accessed at the bottom', function() {
          var collection = new RecentsCollection([
            { id: 'never_accessed_room' },
            { id: 'accessed_room', lastAccessTime: NEW }
          ]);

          collection.sort();

          assert.deepEqual(id(collection), ['accessed_room', 'never_accessed_room']);
        });

        it.skip('doesnt move rooms once they have been accessed', function() {});

        it('promotes rooms if new unread messages arrive', function() {
          var room = new Backbone.Model({ id: 'room', lastAccessTime: NEW });
          var roomToUpdate = new Backbone.Model({ id: 'room_to_update', lastAccessTime: OLD });
          var collection = new RecentsCollection([room, roomToUpdate]);

          roomToUpdate.set('unreadItems', 1);

          collection.sort();

          assert.deepEqual(id(collection), ['room_to_update', 'room']);
        });

      });

    });

  });

});

function id(collection) {
  return collection.map(function(model) {
    return model.get('id');
  });
}
