'use strict';

var Backbone = require('backbone');
var _ = require('underscore');
var Promise = require('bluebird');
var debug = require('debug-proxy')('app:collection-pool');

var DEFAULT_POOL_SIZE = 5;

function Pool(Collection, options) {
  this.Collection = Collection;
  this.idAttribute = options && options.idAttribute || "id";
  var size = this.size = options && options.size || DEFAULT_POOL_SIZE;

  // Initialize the pool with a fixed number of entries which will never change
  var Collection = this.Collection;
  this.lookup = {};
  this.pool = _.chain(size)
    .range()
    .map(function() {
      var model = new Backbone.Model();
      var collection = new Collection([], { contextModel: model, listen: true });
      return { model: model, collection: collection, access: null };
    })
    .value();

}

Pool.prototype = {
  /**
   * Returns a collection for the given id
   */
  get: function(id) {
    var idAttribute = this.idAttribute;

    // If the item is already in the pool, just use it
    var slot = this.lookup[id];
    if (slot) {
      debug('Pool hit %s', id);
      slot.access = Date.now();
      return slot.collection;
    }

    // Try find an empty slot
    var emptySlot = this._findEmpty();

    if (emptySlot) {
      debug('Pool miss, using empty slot for %s', id);

      emptySlot.model.set(idAttribute, id);
      emptySlot.access = Date.now();
      this.lookup[id] = emptySlot;
      return emptySlot.collection;
    }

    // We'll need to recycle one of the existing slots
    // so find the least recently used one and use that
    var lruSlot = this._findLRU();

    var oldId = lruSlot.model.get(idAttribute);
    debug('Pool miss, replacing slot %s with %s', oldId, id);

    delete this.lookup[oldId];

    lruSlot.model.set(idAttribute, id);
    lruSlot.access = Date.now();
    this.lookup[id] = lruSlot;
    return lruSlot.collection;
  },

  /**
   * Preloads a collection with the given id.
   * Importantly, will never evict items if there are not
   * unallocated slots
   */
  preload: function(id, accessTime) {
    var idAttribute = this.idAttribute;

    var slot = this.lookup[id];
    if (slot) {
      debug('Pool preload, collection %s already loaded', id);
      return;
    }

    // Try find an empty slot
    var emptySlot = this._findEmpty();

    if (!emptySlot) {
      debug('Pool preload, ignoring collection %s due to lack of slots', id);
      return;
    }

    debug('Pool preload, loading collection %s', id);

    emptySlot.model.set(idAttribute, id);
    emptySlot.access = accessTime || Date.now();

    this.lookup[id] = emptySlot;
    return new Promise(function(resolve) {
      // TODO, do this better
      emptySlot.collection.once('snapshot', function() {
        debug('Pool preload, collection %s load complete', id);
        resolve();
      });
    });

  },

  /**
   * Find an empty slot and use it
   */
  _findEmpty: function() {
    var idAttribute = this.idAttribute;

    for (var i = 0; i < this.pool.length; i++) {
      var slot = this.pool[i];
      if (!slot.model.get(idAttribute)) {
        return slot;
      }
    }
  },

  /* Find the least recently used slot and use it */
  _findLRU: function() {
    return _.min(this.pool, function(slot) {
      return slot.access;
    });
  }


};

module.exports = Pool;
