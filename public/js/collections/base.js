  /* jshint trailing:false */
  /* global console:true require: true define: true */
  define([
  'jquery',
  'underscore',
  'backbone'
], function($, _, Backbone) {
  "use strict";

  var exports = {
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

      onDataChange: function(e, data) {
        console.log("New dataChange event", data);

        var operation = data.operation;
        var id = data.id;
        var newModel = data.model;
        var model = this.get(id);
        if(operation === 'update') {
          if(!model) {
            console.log("Adding a new model");
            this.add(newModel);
          } else {
            console.log("Updating an existing model");
            model.parse(newModel);
          }
        } else if(operation === 'remove') {
          if(!model) return;
          this.remove(model);
        }
      }
    })

  };

  return exports;
});
