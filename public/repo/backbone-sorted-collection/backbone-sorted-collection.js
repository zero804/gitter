/*jshint undef:true, unused:strict, browser:true *//* global define:false */
define([
  'underscore',
  'backbone'
], function(_, Backbone) {
  // -----------------------------------------------------------------------------------
  // PROXY COLLECTION
  // -----------------------------------------------------------------------------------

  // Methods in the collection prototype that we won't expose
  var blacklistedMethods = [
    "_onModelEvent", "_prepareModel", "_removeReference", "_reset", "add",
    "initialize", "sync", "remove", "reset", "set", "push", "pop", "unshift",
    "shift", "sort", "parse", "fetch", "create", "model", "off", "on",
    "listenTo", "listenToOnce", "bind", "trigger", "once", "stopListening"
  ];

  var eventWhiteList = [
    'add', 'remove', 'reset', 'sort', 'destroy'
  ];

  function proxyCollection(from, target) {
    function updateLength() {
      target.length = from.length;
    }

    function pipeEvents(eventName) {
      var args = _.toArray(arguments);
      var isChangeEvent = eventName === 'change' ||
                          eventName.slice(0, 7) === 'change:';

      // In the case of a `reset` event, the Collection.models reference
      // is updated to a new array, so we need to update our reference.
      if (eventName === 'reset') {
        target.models = from.models;
      }

      if (_.contains(eventWhiteList, eventName)) {
        if (_.contains(['add', 'remove', 'destory'], eventName)) {
          args[2] = target;
        } else if (_.contains(['reset', 'sort'], eventName)) {
          args[1] = target;
        }
        target.trigger.apply(this, args);
      } else if (isChangeEvent) {
        // In some cases I was seeing change events fired after the model
        // had already been removed from the collection.
        if (target.contains(args[1])) {
          target.trigger.apply(this, args);
        }
      }
    }

    var methods = {};

    _.each(_.functions(Backbone.Collection.prototype), function(method) {
      if (!_.contains(blacklistedMethods, method)) {
        methods[method] = function() {
          return from[method].apply(from, arguments);
        };
      }
    });

    _.extend(target, Backbone.Events, methods);

    target.listenTo(from, 'all', updateLength);
    target.listenTo(from, 'all', pipeEvents);
    target.models = from.models;

    updateLength();
    return target;
  }

  // -----------------------------------------------------------------------------------
  // SORTED COLLECTION
  // -----------------------------------------------------------------------------------

  function comparatorAdapter(fieldExtractor) {
    return function(left, right) {
      var l = fieldExtractor(left);
      var r = fieldExtractor(right);

      if(l === r) return 0;

      return l < r ? -1 : 1;
    };
  }

  function sortedIndex(array, obj, comparator) {
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      if(comparator(array[mid], obj) < 0) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    return low;
  }

  function onAdd(model) {
    var index;
    if (!this._comparator) {
      index = this._superset.indexOf(model);
    } else {
      index = sortedIndex(this._collection.models, model, this._comparator);
    }

    this._collection.add(model, { at: index });
  }

  function onRemove(model) {
    if (this.contains(model)) {
      this._collection.remove(model);
    }
  }

  function onChange(model) {
    var c = this._comparator;

    if(!c) return;

    // Never adjust the order of a length one collection
    if(this._collection.length < 2) return;

    // Figure out if this item is still in the right place
    var index = this._collection.indexOf(model);
    if(index < 0) return;

    var ooo; // Out of order

    if(index === 0) {
      // Compare with the next model
      if(c(model, this._collection.at(1)) > 0) {
        // Out of order
        ooo = true;
      }
    } else if(index === this._collection.length - 1) {
      // Compare with the previous model
      if(c(this._collection.at(this._collection.length - 2), model) > 0) {
        // Out of order
        ooo = true;
      }
    } else {
      // Compare with the next model
      if(c(model, this._collection.at(index + 1)) > 0) {
        // Out of order
        ooo = true;
      }

      // Compare with the next model
      if(c(this._collection.at(index - 1), model) > 0) {
        // Out of order
        ooo = true;
      }

    }

    if(ooo) {
      this._collection.remove(model);
      onAdd.call(this, model);
    }
  }

  function sort() {
    if (!this._comparator) {
      this._collection.reset(this._superset.toArray());
      return;
    }

    var newOrder = this._superset.toArray();
    newOrder.sort(this._comparator);
    this._collection.reset(newOrder);
  }

  function Sorted(superset) {
    // Save a reference to the original collection
    this._superset = superset;
    this._comparator = null;

    // The idea is to keep an internal backbone collection with the paginated
    // set, and expose limited functionality.
    this._collection = new Backbone.Collection(superset.toArray());
    proxyCollection(this._collection, this);

    this.listenTo(this._superset, 'add', onAdd);
    this.listenTo(this._superset, 'remove', onRemove);
    this.listenTo(this._superset, 'change', onChange);
    this.listenTo(this._superset, 'reset', sort);
  }

  function lookupIterator(value) {
    var f = value;
    if(!_.isFunction(value)) {
      f = function(obj) {
        return obj.get(value);
      };
    }

    if(f.length === 1) f = comparatorAdapter(f);
    return f;
  }

  var methods = {
    setSort: function(comparator) {
      if(comparator) {
        this._comparator = lookupIterator(comparator);
      } else {
        this._comparator = comparator;
      }

      sort.call(this);

      if (!comparator) {
        this.trigger('sorted:remove');
      } else {
        this.trigger('sorted:add');
      }

      return this;
    },

    removeSort: function() {
      this.setSort();
      return this;
    },

    superset: function() {
      return this._superset;
    },

    destroy: function() {
      this.stopListening();
      this._collection.reset([]);
      this._superset = this._collection;
      this.length = 0;

      this.trigger('sorted:destroy');
    }

  };

  // Build up the prototype
  _.extend(Sorted.prototype, methods, Backbone.Events);

  return Sorted;
});