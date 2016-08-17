"use strict";

const {Collection} = require('backbone');
const {UPDATE_ACTIVE_TAG} = require('../constants/forum-tags');


module.exports = Collection.extend({

  initialize: function(models, attrs) {
    this.router = attrs.router;
    this.listenTo(this.router, 'change:tagName', this.onTagUpdate, this);
  },

  onTagUpdate(model, val){
    this.where({ active: true }).forEach((m) => m.set('active', false));
    this.findWhere({ value: val }).set('active', true);
    this.trigger(UPDATE_ACTIVE_TAG);
  },

  getActiveTagName(){
    return this.findWhere({ active: true }).get('value');
  },

  getTags: function() {
    return this.models.map(model => model.toJSON());
  },
});
