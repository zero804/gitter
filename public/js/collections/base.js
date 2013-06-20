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
    constructor: function(models, options) {
      Backbone.Collection.prototype.constructor.call(this, models, options);

      if(!this.url) {
        this.url = "/troupes/" + window.troupeContext.troupe.id + "/" + this.nestedUrl;
      }

      this._loading = false;

      this.once('reset sync', this._onInitialLoad, this);

      this.on('sync', this._onSync, this);
      this.on('request', this._onRequest, this);

      this.once('error', function() {
        $('#' + this.modelName + '-fail').show('fast', function() {
        });
      }, this);

      if(options) {

        if(options.preloader) {
          var preloader = options.preloader;
          this.preloader = preloader;

          preloader.on('preload:start', this._onPreloadStart, this);
          preloader.on('preload:complete', this._onPreloadComplete, this);
        }

        if(options.listen) {
          this.listen();
        }

      }

    },

    _onPreloadStart: function() {
      this._loading = true;
      this.reset([]);
    },

    _onSync: function() {
      this._loading = false;
    },

    _onRequest: function() {
      this._loading = true;
    },

    _onPreloadComplete: function(data) {
      this._comparePreloadToSubscription();
      var items = data[this.preloadKey];
      this.add(items, { parse: true, merge: true, sort: true });
      this._loading = false;
      this.trigger('sync');
      this.trigger('reset', this.models);
    },

    _onInitialLoad: function() {
      if(this._initialLoadCalled) return;
      this._initialLoadCalled = true;

      $('#' + this.modelName + '-amuse').hide('fast', function() {
        $(this).remove();
      });

      if (this.length===0) {
        $('#' + this.modelName + '-empty').fadeIn('fast');
      }
    },

    _comparePreloadToSubscription: function() {
      if(this.preloader) {
        var preloadTimestamp = this.preloader.getTimestamp();
        var subscriptionTimestamp = realtime.getSubscriptionTimestamp(this.url);

        if(subscriptionTimestamp > preloadTimestamp) {
          log('WARNING: Difference in timestamps is ', preloadTimestamp - subscriptionTimestamp, preloadTimestamp, subscriptionTimestamp);
        }

      }
    },

    listen: function(callback) {
      if(this.subscription) return;
      var self = this;

      this.subscription = realtime.subscribe(this.url, function(message) {
        self._onDataChange(message);
      });

      this.subscription.callback(function() {
        log('Listening to ' + self.url);
        self._comparePreloadToSubscription();

        if(callback) return callback();
      });

      this.subscription.errback(function(error) {
        log('Subscription error for ' + self.url, error);
        if(callback) return callback(error);
      });
    },

    isLoading: function() {
      return this._loading;
    },

    unlisten: function() {
      if(!this.subscription) return;
      this.subscription.cancel();
      this.subscription = null;
    },

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

    _onDataChange: function(data) {
      var operation = data.operation;
      var newModel = data.model;
      var id = newModel.id;

      if(this.transformModel) newModel = this.transformModel(newModel);
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

  var Preloader = function() {
    var that = this;

    $(document).on('realtime:newConnectionEstablished', function() {
      if(!that.initialConnectionEstablished) {
        that.initialConnectionEstablished = true;
        return;
      }

      that.fetchData();
    });
  };

  _.extend(Preloader.prototype, Backbone.Events, {
    getTimestamp: function() {
      return this._timestamp;
    },

    fetchData: function() {
      if(this.preloadStarted) return;
      this.preloadStarted = true;

      log('Reloading data');

      this.trigger('preload:start');

      $.ajax({
        url: window.location.pathname + '/preload?d=' + Date.now(),
        dataType: "json",
        type: "GET",
        context: this,
        success: function(data) {
          log('Preload completed, resetting collections');
          this.preloadStarted = false;

          this._timestamp = moment(data.timestamp).toDate();

          this.trigger('preload:complete', data);
        }
      });
    }
  });

  exports.preloader = new Preloader();

  return exports;
});
