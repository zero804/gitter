define([
  'underscore',
  'components/apiClient',
  'backbone',
  'components/realtime',
  'log!collections',
  './equals'
], function(_, apiClient, Backbone, realtime, log, equals) {
  "use strict";

  var PATCH_TIMEOUT = 2000; // 2000ms before a patch gives up

  Backbone.isEqual = equals;

  var exports = {
    firstLoad: false
  };

  var methodMap = {
    'create': 'post',
    'update': 'put',
    'patch':  'patch',
    'delete': 'delete',
    'read':   'get'
  };

  Backbone.sync = function(method, model, options) {
    var url = options.url || _.result(model, 'url');
    if(!url) throw new Error('URL required');

    var m = methodMap[method];

    var promise;
    if(m === 'get') {
      promise = apiClient[m](url, options.data);
    } else {
      promise = apiClient[m](url, model);
    }

    if(options.success) {
      promise = promise.then(options.success);
    }
    if(options.error) {
      promise = promise.fail(options.error);
    }
    return promise;
  };

  exports.Model = Backbone.Model.extend({
    constructor: function() {
      Backbone.Model.prototype.constructor.apply(this, Array.prototype.slice.apply(arguments));

      var t = this;
      function setStatus(s) {
        t.syncStatus = s;
        t.trigger('syncStatusChange', s);
      }

      this.syncStatus = null;

      this.listenTo(this, 'sync', function() {
        setStatus('synced');
      });

      this.listenTo(this, 'request', function() {
        setStatus('syncing');
      });

      this.listenTo(this, 'error', function() {
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
    modelName: '',
    constructor: function(models, options) {
      Backbone.Collection.prototype.constructor.call(this, models, options);

      this._loading = false;

      this.once('sync', this._onInitialLoad, this);
      this.on('sync', this._onSync, this);
      this.on('request', this._onRequest, this);

      if(options && options.listen) {
        this.listen();
      }

    },

    addWaiter: function(id, callback, timeout) {
      log('Waiting for id', id);

      if(!id) return;

      var self = this;
      var idAttribute = this.model.prototype.idAttribute || 'id';

      var actionPerformed = false;

      function done(model) {
        clearTimeout(timeoutRef);
        log('Waitor completed with model', model);

        self.off('add', check, id);
        self.off('change:id', check, id);

        if(actionPerformed) {
          log('Warning: waitor function called twice.');
          return;
        }
        actionPerformed = true;

        if(model) {
          callback.apply(self, [model]);
        } else {
          callback.apply(self, []);
        }
      }

      function check(model) {
        if(model && model[idAttribute] === id) {
          done(model);
        }
      }

      var timeoutRef = setTimeout(function() {
        done();
      }, timeout);

      this.on('add', check, id);
      this.on('change:id', check, id);
    },

    _onSync: function() {
      this._loading = false;
    },

    _onRequest: function() {
      this._loading = true;
    },

    _onInitialLoad: function() {
      if(this._initialLoadCalled) return;
      this._initialLoadCalled = true;

      this.trigger('loaded');
    },

    listen: function() {
      if(this.subscription) return;
      var self = this;

      // this.url or this.url()
      var url = _.result(this, 'url');
      if(!url) throw new Error('URL is required');

      this.subscription = realtime.subscribe(url, function(message) {
        self._onDataChange(message);
      });

      function getState() {
        return self.getSnapshotState();
      }

      var stateProvider = this.getSnapshotState && getState;

      realtime.registerForSnapshots(url, function(snapshot) {
        self.trigger('request');
        /**
         * Don't remove items from the collections, as there is a greater
         * chance that they've been added on the client than that they've
         * been removed from the server. One day we may want to handle the
         * case that the server object has been removed, but it's not that
         * likely and doesn't warrant the extra complexity
         */
        var options = {
          parse: true,    /* parse the items */
          remove: true,
          add: true,      /* add new items */
          merge: true     /* merge into items that already exist */
        };

        if(self.length > 0) {
          /* Remove any presnapshot stuff (cached from previous time) */
          var forKeeping = self.where({ presnapshot: undefined });

          // add one by one
          self.set(snapshot.concat(forKeeping), options);
        } else {
          // trash it and add all in one go
          self.reset(snapshot, options);
        }

        self._onInitialLoad();
        self.trigger('sync');
        self.trigger('snapshot');
      }, stateProvider);

      this.subscription.errback(function(error) {
        log('Subscription error for ' + url, error);
      });
    },

    isLoading: function() {
      return this._loading;
    },

    hasLoaded: function() {
      return this._initialLoadCalled;
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

      // New operation is unversioned? Dodgy. Only allow if the operation is a patch
      if(!incomingVersion) return operation === 'patch';

      if(operation === 'patch') {
        return incomingVersion >= existingVersion;
      }

      return incomingVersion > existingVersion;
    },

    // TODO: make this dude tighter
    applyUpdate: function(operation, existingModel, newAttributes, parsed, options) {
      if(this.operationIsUpToDate(operation, existingModel, newAttributes)) {
        log('Performing ' + operation, newAttributes);

        existingModel.set(parsed.attributes, options || {});
      } else {
        log('Ignoring out-of-date update', existingModel.toJSON(), newAttributes);
      }
    },

    patch: function(id, newModel, options) {
      log('Request to patch ' + id + ' with ', newModel, options);

      var self = this;

      if(this.transformModel) newModel = this.transformModel(newModel);
      var parsed = new this.model(newModel, { parse: true });
      var existing = this.findExistingModel(id, parsed);
      if(existing) {
        this.applyUpdate('patch', existing, newModel, parsed, options);
        return;
      }

      /* Existing model does not exist */
      this.addWaiter(id, function(existing) {
        if(!existing) {
          log('Unable to find model ' + id);
          return;
        }

        self.applyUpdate('patch', existing, newModel, parsed, options);
      }, PATCH_TIMEOUT);
    },

    _onDataChange: function(data) {
      var self = this;
      var operation = data.operation;
      var newModel = data.model;
      var idAttribute = this.model.prototype.idAttribute || 'id';
      var id = newModel[idAttribute];

      if(this.ignoreDataChange) {
        if(this.ignoreDataChange(data)) return;
      }

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
            this.applyUpdate(operation, existing, newModel, parsed);
            break;
          } else {
            /* Can't find an existing model */
            if(operation === 'patch') {
              this.addWaiter(id, function(existing) {
                if(!existing) {
                  log('Unable to find model ' + id);
                  return;
                }

                self.applyUpdate('patch', existing, newModel, parsed);
              }, PATCH_TIMEOUT);

            } else {
              this.add(parsed);
            }
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

  exports.LoadingMixin = {
    initialize: function() {
      if(this.length === 0) {
        this.loading = true;
        this.listenToOnce(this, 'add reset sync', this.loadComplete);
      }
    },
    loadComplete: function() {
      delete this.loading;
      this.trigger('loaded');
    }
  };

  exports.UnderlyingLoadingMixin = {
    initialize: function() {
      if(this.collection.loading) {
        this.loading = true;
        this.listenToOnce(this.collection, 'loaded', this.loadComplete);
      }
    },
    loadComplete: function() {
      delete this.loading;
      this.trigger('loaded');
    }
  };

  exports.SearchResultsCollection = {
    parse: function(searchResponse) {
      var limit = searchResponse.limit;
      if(searchResponse.results.length < limit) {
        this._noMoreData = true;
      }
      return searchResponse.results;
    },

    query: function(query) {
      if(!query) {
        query = {};
      } else if(typeof query === 'string') {
        query = { q: query };
      }

      if(_.isEqual(query, this._currentQuery)) return;

      this._currentQuery = query;
      this._skip = 0;
      this._noMoreData = false;
      this.fetchNext({ remove: true });
      this.trigger('search:newquery');
    },

    fetchNext: function(options) {
      function noOp() {}

      if(!options) options = {};

      if(this._noMoreData) return;
      var context = options.context;
      var done = options.done || noOp;
      var noMore = options.noMore || noOp;

      if(context) {
        done = done.bind(context);
        noMore = noMore.bind(context);
      }

      var data = _.extend({}, this._currentQuery, { skip: this._skip });

      var self = this;
      this.trigger('search:next');
      log('Fetch next: ', data);
      this.fetch({
        remove: ('remove' in options) ? options.remove : false,
        add: ('add' in options) ? options.add : true,
        merge: ('merge' in options) ? options.merge : true,
        data: data,
        success: function() {
          self._skip = self.length;
          if(self._noMoreData) {
            self.trigger('search:nomore');
            noMore();
          }
          self.trigger('search:fetch:complete');
          done();
        },
        error: function() {
          self.trigger('search:fetch:complete');
          done();
        }
      });
    }
  };

  /* This is a mixin for Backbone.Model */
  exports.ReversableCollectionBehaviour = {
    initialize: function() {
      if(this.initialSortBy) {
        this.setSortBy(this.initialSortBy);
      }
    },

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

  // // used to indicate that the first collection has been loaded, ie loading screen can be hidden
  // function triggerFirstLoad() {
  //   if(!exports.firstLoad) {
  //     exports.firstLoad = true;
  //     appEvents.trigger('firstCollectionLoaded');
  //   }
  // }

  return exports;
});
