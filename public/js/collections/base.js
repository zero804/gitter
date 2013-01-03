  /* jshint trailing:false browser:true */
  /* global console */
  define([
  'jquery',
  'underscore',
  'backbone'
], function($, _, Backbone) {
  /* jshint trailing:false browser:true */
  /*global console: false, window: false, document: false */
  "use strict";

  var exports = {
    Model: Backbone.Model.extend({
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

        // For each `set` attribute...
        for (attr in attrs) {
          val = attrs[attr];

          // -- This is different from base backbone. If the attr is a collection
          // -- reset the collection
          var currentValue = this.get(attr);
          if(currentValue instanceof Backbone.Collection) {
            currentValue.reset(val);
            delete attrs[attr];
          }
        }

        return Backbone.Model.prototype.set.call(this, attrs, options);
      }

    }),

    LiveCollection: Backbone.Collection.extend({
      nestedUrl: '',
      modelName: '',
      constructor: function(options) {
        Backbone.Collection.prototype.constructor.call(this, options);
        _.bindAll(this, 'onDataChange');
        this.url = "/troupes/" + window.troupeContext.troupe.id + "/" + this.nestedUrl;
      },

      listen: function() {
        console.log("Listening on datachange:" + this.modelName);
        $(document).bind('datachange:' + this.modelName, this.onDataChange);
      },

      unlisten: function() {
        $(document).unbind('datachange:' + this.modelName, this.onDataChange);
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

      onDataChange: function(e, data) {
        console.log(["onDataChange", {
          operation: data.operation,
          id: data.id
        }]);

        var operation = data.operation;
        var id = data.id;
        var newModel = data.model;
        var parsed = new this.model(newModel, { parse: true });

        console.log("WARNING: as collection stands: ", this.toJSON());

        var existing = this.findExistingModel(id, parsed);

        switch(operation) {
          case 'create':
          case 'update':
            if(existing) {
              var l = this.length;
              this.remove(existing);
              if(this.length !== l - 1) {
                console.log("Nothing was deleted. This is a problem.");
              }
            }

            this.add(parsed);
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
    })

  };

  return exports;
});
