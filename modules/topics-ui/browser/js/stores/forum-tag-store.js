"use strict";

var Backbone = require('backbone');
var {dispatch} = require('../dispatcher');
var updateActiveTag = require('../action-creators/forum/update-active-tag');

module.exports = Backbone.Collection.extend({

  initialize: function(models, attrs) {
    this.router = attrs.router;
    this.listenTo(this.router, 'change:tagName', this.onTagUpdate, this);
  },

  onTagUpdate(model, val){
    this.where({ active: true }).forEach((m) => m.set('active', false));
    this.findWhere({ value: val }).set('active', true);
    dispatch(updateActiveTag(val));
  },

  getActiveTagName(){
    return this.findWhere({ active: true }).get('value');
  },

  getTags: function() {
    return this.models.map(model => model.toJSON());
  },
});
