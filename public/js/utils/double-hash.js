"use strict";
var _ = require('underscore');
var utils = require('utils/utils');

module.exports = (function() {


  // -----------------------------------------------------
  // Stores value pairs
  // -----------------------------------------------------

  var DoubleHash = function() {
    this._data = {};
  };

  DoubleHash.prototype = {
    // Add an item, return true if it did not exist before
    _add: function(itemType, itemId) {
      var self = this;
      var substore = self._data[itemType];
      if(!substore) {
        substore = self._data[itemType] = {};
      }

      var exists = substore[itemId];
      if(exists) return false;
      substore[itemId] = true;

      if(self._maxItems) {
        var items = _.keys(substore);
        if(items.length > self._maxItems) {
          items.sort(utils.naturalComparator);
          var forRemoval = items.slice(0, - self._maxItems);
          forRemoval.forEach(function(itemId) {
            self._remove(itemType, itemId);
          });
        }
      }

      if(self._onItemAdded) self._onItemAdded(itemType, itemId);

      return true;
    },

    // Add an item, return true iff it exists
    _remove: function(itemType, itemId) {
       var substore = this._data[itemType];
      if(!substore) return false;
      var exists = substore[itemId];
      if(!exists) return false;

      delete substore[itemId];

      if(_.keys(substore).length === 0) {
        delete this._data[itemType];
      }

      if(this._onRemoveChild) this._onRemoveChild(itemType, itemId);

      return true;
    },

    _contains: function(itemType, itemId) {
      var substore = this._data[itemType];
      if(!substore) return false;
      return !!substore[itemId];
    },

    _count: function() {
      var types = _.keys(this._data);

      return _.reduce(types, function(memo, itemType) {
        var ids = _.keys(this._data[itemType]);
        return memo + ids.length;
      }, 0, this);
    },

    _getItemsOfType: function(itemType) {
      var substore = this._data[itemType];
      if(!substore) return [];
      return Object.keys(substore);
    },

    _marshall: function() {
      var self = this;
      var r = {};
      var types = _.keys(self._data);
      _.each(types, function(itemType) {
        var array = [];

        _.each(_.keys(self._data[itemType]), function(itemId) {
          array.push(itemId);
        });

        r[itemType] = array;
      });

      return r;
    }
  };

  return DoubleHash;


})();

