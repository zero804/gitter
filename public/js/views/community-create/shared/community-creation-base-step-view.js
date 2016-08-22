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
    'change': 'onChange',
    'invalid': 'onInvalid'
  },

  events: {
    'click @ui.nextStep': 'onStepNext',
    'click @ui.backStep': 'onStepBack',
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
  },

  onStepNext: function(e) {
    if (e) {
      e.preventDefault();
    }

    var next = _.result(this, 'nextStep', null);
    if (next) {
      this.communityCreateModel.set('stepState', next);
    }
    return false;
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
