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
    'change:active': 'onActiveChange',
    'change:valid': 'onValidChange'
  },

  initialize: function(options) {
    this.model = options.model;
    this.communityCreateModel = options.communityCreateModel;
  },

  onActiveChange: function() {
    toggleClass(this.$el[0], 'active', this.model.get('active'));
  },

  onValidChange: function() {
    var isValid = this.model.get('valid');
    toggleClass(this.ui.nextStep[0], 'disabled', !isValid);
    //this.ui.nextStep[0][isValid ? 'removeAttribute' : 'setAttribute']('disabled', 'disabled');
  },

  onRender: function() {
    this.onActiveChange();
    this.onValidChange();
  }
});
