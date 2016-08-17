"use strict"

import {Collection} from 'backbone'
import {UPDATE_ACTIVE_CATEGORY} from '../constants/forum-categories';

var Model = Backbone.Model.extend({
  defaults: { category: null },
});

module.exports = Collection.extend({
  model: Model,

  initialize: function(models, attrs) {
    this.router = attrs.router;
    this.listenTo(this.router, 'change:categoryName', this.onCategoryUpdate, this);
  },

  getCategories: function() {
    return this.models.map(model => model.toJSON());
  },

  onCategoryUpdate(model, val){
    this.where({ active: true }).forEach((m) => m.set('active', false));
    this.findWhere({ category: val }).set('active', true);
    this.trigger(UPDATE_ACTIVE_CATEGORY);
  }

});
