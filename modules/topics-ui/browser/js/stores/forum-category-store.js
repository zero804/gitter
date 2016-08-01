"use strict"

var Backbone = require('backbone');

var Model = Backbone.Model.extend({
  defaults: { category: null },
  constructor: function(attrs, options){
    attrs = { category: attrs };
    Backbone.Model.prototype.constructor.call(this, attrs, options);
  },
  toJSON: function(){ return this.get('category'); }
});

module.exports = Backbone.Collection.extend({
  model: Model,
  getCategories: function() {
    return this.models.map(model => model.toJSON());
  }
});
