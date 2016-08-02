"use strict"

var Backbone = require('backbone');

var Model = Backbone.Model.extend({
  defaults: { category: null },
});

module.exports = Backbone.Collection.extend({
  model: Model,
  getCategories: function() {
    return this.models.map(model => model.toJSON());
  }
});
