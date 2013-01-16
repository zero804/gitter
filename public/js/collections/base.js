/*jshint unused:true browser:true*/
define([
  'jquery',
  'underscore',
  'backbone',
  'components/realtime'
], function($, _, Backbone, realtime) {
  /* jshint trailing:false browser:true */
  /*global console: false, window: false, document: false */
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
      console.log("Subscribing to " + this.url);

      this.subscription = realtime.subscribe(this.url, function(message) {
        self.onDataChange(message);
      });

      this.subscription.callback(function() {
        console.log('Subscription is now active!');
      });

      this.subscription.errback(function(error) {
        console.log('Subscription error', error.message);
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
      var id = data.id;
      var newModel = data.model;
      var parsed = new this.model(newModel, { parse: true });

      var existing = this.findExistingModel(id, parsed);

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


  return exports;
});
