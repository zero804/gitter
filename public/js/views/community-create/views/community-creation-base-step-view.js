'use strict';

var Marionette = require('backbone.marionette');
var toggleClass = require('utils/toggle-class');



module.exports = Marionette.LayoutView.extend({
  template: false,

  ui: {
    nextStep: '.js-community-create-step-next',
    backStep: '.js-community-create-step-back'
  },

  triggers: {
    'click @ui.nextStep': 'step:next',
    'click @ui.backStep': 'step:back',
  },

  modelEvents: {
    'change:active': 'onChangeActive'
  },

  initialize: function(options) {
    this.model = options.model;
    this.communityCreateModel = options.communityCreateModel;
  },

  onChangeActive: function() {
    toggleClass(this.$el[0], 'active', this.model.get('active'));
  },

  onRender: function() {
    this.onChangeActive();
  }
});
