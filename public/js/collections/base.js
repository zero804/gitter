/*jshint unused:true browser:true*/
define([
  'jquery',
  'underscore',
  'backbone',
  'components/realtime'
], function($, _, Backbone, realtime) {
  /*global console:false */
  "use strict";

  var exports = {};

  exports.Model = Backbone.Model.extend({
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
          currentValue.reset(val);
          this.changed[attr] = val;
          changes[attr] = true;
          delete attrs[attr];
          hasChanges = true;
        }
      }

      if(hasChanges) {
        options.changes = changes;
        this.change(options);

        // TODO: Probably not the best
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
      this.url = "/troupes/" + window.troupeContext.troupe.id + "/" + this.nestedUrl;
    },

    listen: function() {
      //console.log("Listening on datachange:" + this.modelName);
      //$(document).bind('datachange:' + this.modelName, this.onDataChange);
      if(this.subscription) return;
      var self = this;

      this.subscription = realtime.subscribe(this.url, function(message) {
        self.onDataChange(message);
      });

      this.subscription.callback(function() {
        console.log('Subscription is now active!', arguments);
      });

      this.subscription.errback(function(error) {
        console.log('Subscription error', error);
      });
    },

    unlisten: function() {
      if(!this.subscription) return;
      this.subscription.cancel();
      this.subscription = null;
    },

    /* TODO: remove when we upgrade to 0.9.9 */
    once: function(ev, callback, context) {
      var onceFn = function() { this.unbind(ev, onceFn); callback.apply(context || this, arguments); };
      this.bind(ev, onceFn);
      return this;
    },

    findExistingModel: function(id, newModel) {
      var existing = this.get(id);
      if(existing) return existing;

      if(this.findModelForOptimisticMerge) {
        console.log("Looking for a candidate for ", newModel);

        existing = this.findModelForOptimisticMerge(newModel);
      }

      return existing;
    },

    onDataChange: function(data) {
      console.log(["onDataChange",data]);

      var operation = data.operation;
      var newModel = data.model;
      var id = newModel.id;
      var parsed = new this.model(newModel, { parse: true });

      var existing = this.findExistingModel(id, parsed);
      console.log("OPERATION IS " + operation);

      switch(operation) {
        case 'create':
        case 'update':
          if(existing) {
            /*
            var l = this.length;
            this.remove(existing);
            if(this.length !== l - 1) {
              console.log("Nothing was deleted. This is a problem.");
            }
            */
            console.log("Existing ", existing, " set ", newModel);
            existing.set(newModel);
          } else {
            this.add(parsed);
          }

          break;

        case 'remove':
          if(existing) {
            this.remove(existing);
          }

          break;

        default:
          console.log("Unknown operation " + operation + ", ignoring");

      }
    }
  });

  /* This is a mixin for Backbone.Model */
  exports.ReversableCollectionBehaviour = {

    sortMethods: {

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


      var sortByMethod = function defaultSortByMethod(model) {
        return model.get(fieldLookup);
      };

      if (this.sortByMethods[fieldLookup])
        sortByMethod = this.sortByMethods[fieldLookup];

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
