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
    'change': 'onChange',
    'invalid': 'onInvalid'
  },

  initialize: function(options) {
    this.model = options.model;
    this.communityCreateModel = options.communityCreateModel;

    this.listenTo(this.communityCreateModel, 'invalid', this.onInvalid, this);
    this.listenTo(this.communityCreateModel, 'change', this.onChange, this);
  },

  onActiveChange: function() {
    toggleClass(this.$el[0], 'active', this.model.get('active'));
  },

  onChange: function() {
    this.applyValidMessages(this.model.isValid());
  },

  onInvalid: function() {
    this.applyValidMessages(false);
  },

  applyValidMessages: function(isValid/*, isAfterRender*/) {
    toggleClass(this.ui.nextStep[0], 'disabled', !isValid);
    //this.ui.nextStep[0][isValid ? 'removeAttribute' : 'setAttribute']('disabled', 'disabled');
  },

  onRender: function() {
    this.onActiveChange();
    this.model.isValid();
    this.applyValidMessages(true);
  }
});
