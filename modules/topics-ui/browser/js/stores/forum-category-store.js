"use strict"

var Backbone = require('backbone');
var { dispatch } = require('../dispatcher');
var updateActiveCategory = require('../action-creators/forum/update-active-category');

var Model = Backbone.Model.extend({
  defaults: { category: null },
});

module.exports = Backbone.Collection.extend({
  model: Model,

  initialize: function(models, attrs) {
    this.router = attrs.router;
    this.listenTo(this.router, 'change:categoryName', this.onCategoryUpdate, this);
  },

  /*
   TODO -->
   This functionality is pretty generic on the client,
   we should abstract into a base client here
   */
  getCategories: function() {
    return this.models.map(model => model.toJSON());
  },

  onCategoryUpdate(model, val){
    this.where({ active: true }).forEach((m) => m.set('active', false));
    this.findWhere({ category: val }).set('active', true);
    dispatch(updateActiveCategory(val));
  }

});
