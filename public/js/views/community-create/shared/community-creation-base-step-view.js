'use strict';

var Marionette = require('backbone.marionette');
var toggleClass = require('utils/toggle-class');
var _ = require('underscore');

module.exports = Marionette.LayoutView.extend({
  template: false,

  ui: {
    nextStep: '.js-community-create-step-next',
    backStep: '.js-community-create-step-back'
  },

  modelEvents: {
    'change:active': 'onActiveChange',
    'change': 'onChange'
  },

  events: {
    'click @ui.nextStep': 'onStepNext',
    'click @ui.backStep': 'onStepBack',
  },

  initialize: function(options) {
    this.model = options.model;
    this.communityCreateModel = options.communityCreateModel;

    this.listenTo(this.communityCreateModel, 'change', this.onChange, this);
  },

  onActiveChange: function() {
    toggleClass(this.$el[0], 'active', this.model.get('active'));
  },

  onChange: function() {
    this.applyValidMessages();
  },

  applyValidMessages: function() {
    var isValid = this.model.isValid();
    toggleClass(this.ui.nextStep[0], 'disabled', !isValid);
  },

  onRender: function() {
    this.onActiveChange();
    this.model.isValid();
    this.applyValidMessages();
  },

  onStepNext: function(e) {
    var next = _.result(this, 'nextStep', null);
    if (next) {
      if (e) {
        e.preventDefault();
      }

      this.communityCreateModel.set('stepState', next);

      return false;
    }
  },

  onStepBack: function(e) {
    if (e) {
      e.preventDefault();
    }

    var prev = _.result(this, 'prevStep', null);
    if (prev) {
      this.communityCreateModel.set('stepState', prev);
    }

    return false;
  }
});
