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

      set: function(key, value, options) {
        var attrs, attr, val;

        // Handle both `"key", value` and `{key: value}` -style arguments.
        if (_.isObject(key) || key == null) {
          attrs = key;
          options = value;
        } else {
          attrs = {};
          attrs[key] = value;
        }

        // Extract attributes and options.
        if(!options) (options = {});
        if (!attrs) return this;
        if (attrs instanceof Backbone.Model) attrs = attrs.attributes;
        if (options.unset) for (attr in attrs) attrs[attr] = void 0;

        // Run validation.
        if (!this._validate(attrs, options)) return false;

        // Check for changes of `id`.
        if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

        var changes = options.changes = {};
        var now = this.attributes;
        var escaped = this._escapedAttributes;
        var prev = this._previousAttributes || {};

        // For each `set` attribute...
        for (attr in attrs) {
          val = attrs[attr];

          // -- This is different from base backbone. If the attr is a collection
          // -- reset the collection
          if(now[attr] instanceof Backbone.Collection) {
            now[attr].reset(val);
            (options.silent ? this._silent : changes)[attr] = true;

            continue;
          }

          // If the new and current value differ, record the change.
          if (!_.isEqual(now[attr], val) || (options.unset && _.has(now, attr))) {
            delete escaped[attr];
            (options.silent ? this._silent : changes)[attr] = true;
          }

          // Update or delete the current value.
          if(options.unset) { delete now[attr]; } else { now[attr] = val; }

          // If the new and previous value differ, record the change.  If not,
          // then remove changes for this attribute.
          if (!_.isEqual(prev[attr], val) || (_.has(now, attr) != _.has(prev, attr))) {
            this.changed[attr] = val;
            if (!options.silent) this._pending[attr] = true;
          } else {
            delete this.changed[attr];
            delete this._pending[attr];
          }
        }

        // Fire the `"change"` events.
        if (!options.silent) this.change(options);
        return this;
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
