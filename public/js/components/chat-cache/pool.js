'use strict';

var Backbone = require('backbone');
var _ = require('underscore');
var Promise = require('bluebird');

var DEFAULT_POOL_SIZE = 5;

function Pool(Collection, options) {
  this.Collection = Collection;
  this.idAttribute = options && options.idAttribute || "id";
  this.size = options && options.size || DEFAULT_POOL_SIZE;
  this._init();
}

Pool.prototype = {
  _init: function() {
    var pool = [];
    for (var i = 0; i < this.size; i++) {
      var model = new Backbone.Model();
      var collection = new this.Collection([], { contextModel: model, listen: true });
      pool.push({ model: model, collection: collection, access: null });
    }

    this.lookup = {};
    this.pool = pool;
  },

  /**
   * Returns a collection for the given id
   */
  get: function(id) {
    var idAttribute = this.idAttribute;

    // If the item is already in the pool, just use it
    var slot = this.lookup[id];
    if (slot) {
      slot.access = Date.now();
      return slot.collection;
    }

    // Try find an empty slot
    var emptySlot = this._findEmpty();

    if (emptySlot) {
      emptySlot.model.set(idAttribute, id);
      emptySlot.access = Date.now();
      this.lookup[id] = emptySlot;
      return emptySlot.collection;
    }

    // We'll need to recycle one of the existing slots
    // so find the least recently used one and use that
    var lruSlot = this._findLRU();

    var oldId = lruSlot.model.get(idAttribute);
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
      return;
    }

    // Try find an empty slot
    var emptySlot = this._findEmpty();

    if (emptySlot) {
      emptySlot.model.set(idAttribute, id);
      emptySlot.access = accessTime || Date.now();

      this.lookup[id] = emptySlot;
      return new Promise(function(resolve) {
        // TODO, do this better
        emptySlot.collection.once('snapshot', resolve);
      });
    }

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
