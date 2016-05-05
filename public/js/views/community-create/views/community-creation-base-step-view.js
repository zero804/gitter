'use strict';

var Marionette = require('backbone.marionette');
var toggleClass = require('utils/toggle-class');



module.exports = Marionette.LayoutView.extend({
  template: false,

  ui: {
    nextStep: '.js-community-create-step-next',
    backStep: '.js-community-create-step-back'
  },

  modelEvents: {
    'change:active': 'onActiveChange'
  },

  initialize: function(options) {
    this.model = options.model;
    this.communityCreateModel = options.communityCreateModel;
  },

  onActiveChange: function() {
    toggleClass(this.$el[0], 'active', this.model.get('active'));
  },

  onRender: function() {
    this.onActiveChange();
  }
});
