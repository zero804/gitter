/*jshint globalstrict:true, trailing:false, unused:true, node:true */
define([
  'jquery',
  'underscore',
  'backbone',
  'components/realtime',
  'log!collections'
], function($, _, Backbone, realtime, log) {
  "use strict";

  var exports = {};

  exports.Model = Backbone.Model.extend({
    constructor: function() {
      Backbone.Model.prototype.constructor.apply(this, Array.prototype.slice.apply(arguments));

      var t = this;
      function setStatus(s) {
        t.syncStatus = s;
        t.trigger('syncStatusChange', s);
      }

      this.syncStatus = null;

      this.on('sync', function() {
        setStatus('synced');
      });

      this.on('request  ', function() {
        setStatus('syncing');
      });

      this.on('error', function() {
        setStatus('syncerror');
      });
    },

    convertArrayToCollection: function(attr, Collection) {
      var val = this.get(attr);
      if(_.isArray(val)) {
        this.set(attr, new Collection(val, { parse: true }));
      }
    },

    // Set a hash of model attributes on the object, firing `"change"` unless
    // you choose to silence it.
    set: function(key, val, options) {
      var attr, attrs;
      if (!key) return this;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (_.isObject(key)) {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      var changes = {};
      if(!options) options = {};
      var hasChanges = false;

      // For each `set` attribute...
      for (attr in attrs) {
        val = attrs[attr];

        // -- This is different from base backbone. If the attr is a collection
        // -- reset the collection
        var currentValue = this.get(attr);
        if(currentValue instanceof Backbone.Collection) {
          if(val instanceof Backbone.Collection) {
            val = val.toJSON();
          }

          currentValue.reset(val);
          this.changed[attr] = val;
          changes[attr] = true;
          this.trigger('change:' + attr, this, this.changed[attr]);
          delete attrs[attr];
          hasChanges = true;
        }
      }

      if(hasChanges) {
        this.trigger('change', this, options);
      }

      return Backbone.Model.prototype.set.call(this, attrs, options);
    }

  });

  // LiveCollection: a collection with realtime capabilities
  exports.LiveCollection = Backbone.Collection.extend({
    nestedUrl: '',
    modelName: '',
    constructor: function(options) {
      Backbone.Collection.prototype.constructor.call(this, options);
      _.bindAll(this, 'onDataChange');
      if(!this.url) {
        this.url = "/troupes/" + window.troupeContext.troupe.id + "/" + this.nestedUrl;
      }

      this.once('reset', function() {
        $('#' + this.modelName + '-amuse').hide('fast', function() {
          $(this).remove();
        });

        if (this.length===0) {
          $('#' + this.modelName + '-empty').fadeIn('fast');
        }

      }, this);

      this.once('error', function() {
        $('#' + this.modelName + '-fail').show('fast', function() {
        });
      }, this);

    },

    listen: function() {
      if(this.subscription) return;
      var self = this;

      this.subscription = realtime.subscribe(this.url, function(message) {
        self.onDataChange(message);
      });

      this.subscription.callback(function() {
        // log('Listening to ' + self.url);
      });

      this.subscription.errback(function(error) {
        log('Subscription error for ' + self.url, error);
      });
    },

    unlisten: function() {
      if(!this.subscription) return;
      this.subscription.cancel();
      this.subscription = null;
    },

    /* TODO: remove when we upgrade to 0.9.9
    once: function(ev, callback, context) {
      var onceFn = function() { this.unbind(ev, onceFn); callback.apply(context || this, arguments); };
      this.bind(ev, onceFn);
      return this;
    }, */

    findExistingModel: function(id, newModel) {
      var existing = this.get(id);
      if(existing) return existing;

      if(this.findModelForOptimisticMerge) {
        existing = this.findModelForOptimisticMerge(newModel);
      }

      return existing;
    },

    operationIsUpToDate: function(operation, existing, newModel) {
      var existingVersion = existing.get('v') ? existing.get('v') : 0;
      var incomingVersion = newModel.v ? newModel.v : 0;

      // Create operations are always allowed
      if(operation === 'create') return true;

      // Existing version is unversioned? Allow
      if(!existingVersion) return true;

      // New operation is unversioned? Dodgy
      if(!incomingVersion) return false;

      if(operation === 'patch') {
        return incomingVersion >= existingVersion;
      }

      return incomingVersion > existingVersion;
    },

    onDataChange: function(data) {
      var operation = data.operation;
      var newModel = data.model;
      var id = newModel.id;

      var parsed = new this.model(newModel, { parse: true });
      var existing = this.findExistingModel(id, parsed);

      switch(operation) {
        case 'create':
        case 'patch':
        case 'update':
          // There can be existing documents for create events if the doc was created on this
          // client and lazy-inserted into the collection
          if(existing) {
            if(this.operationIsUpToDate(operation, existing, newModel)) {
              log('Performing ' + operation, newModel);
              existing.set(parsed.attributes);
            } else {
              log('Ignoring out-of-date update', existing.toJSON(), newModel);
              break;
            }
          }

          if(operation !== 'patch') {
            // No existing document exists, simply treat this as an add
            this.add(parsed);
          }

          break;

        case 'remove':
          if(existing) {
            this.remove(existing);
          }

          break;

        default:
          log("Unknown operation " + operation + ", ignoring");

      }
    }
  });

  /* This is a mixin for Backbone.Model */
  exports.ReversableCollectionBehaviour = {

    setSortBy: function(field) {
      var reverse = false;

      // Sort by the same field twice switches the direction
      if(field === this.currentSortByField) {
        if(field.indexOf("-") === 0) {
          field = field.substring(1);
        } else {
          field = "-" + field;
        }
      }

      var fieldLookup;
      if(field.indexOf("-") === 0) {
        fieldLookup = field.substring(1);
        reverse = true;
      } else {
        fieldLookup = field;
      }

      var sortByMethod;
      if (this.sortByMethods && this.sortByMethods[fieldLookup]) {
        sortByMethod = this.sortByMethods[fieldLookup];
      } else {
        sortByMethod = function defaultSortByMethod(model) {
          return model.get(fieldLookup);
        };
      }

      this.currentSortByField = field;

      var comparator = sortByComparator(sortByMethod);
      if(reverse) {
        comparator = reverseComparatorFunction(comparator);
      }

      this.comparator = comparator;

      return this.sort();
    }

  };

  // Used for switching from a single param comparator to a double param comparator
  function sortByComparator(sortByFunction) {
    return function(left, right) {
      var l = sortByFunction(left);
      var r = sortByFunction(right);

      if (l === void 0) return 1;
      if (r === void 0) return -1;

      return l < r ? -1 : l > r ? 1 : 0;
    };
  }

  function reverseComparatorFunction(comparatorFunction) {
    return function(left, right) {
      return -1 * comparatorFunction(left, right);
    };
  }

  return exports;
});
