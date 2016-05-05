'use strict';

var _ = require('underscore');
var Marionette = require('backbone.marionette');
var toggleClass = require('utils/toggle-class');

var CommunityCreateBaseStepView = require('./community-creation-base-step-view');
var template = require('./community-creation-invite-people-view.hbs');

require('gitter-styleguide/css/components/headings.css');
require('gitter-styleguide/css/components/buttons.css');


module.exports = CommunityCreateBaseStepView.extend({
  template: template,

  attributes: _.extend({}, CommunityCreateBaseStepView.prototype.attributes, {
    class: 'community-create-step-wrapper community-create-invite-people-step-wrapper'
  }),

  events: _.extend({}, CommunityCreateBaseStepView.prototype.events, {
    'click @ui.nextStep': 'onStepNext',
    'click @ui.backStep': 'onStepBack',
  }),

  initialize: function(options) {
    CommunityCreateBaseStepView.prototype.initialize.apply(this, arguments);
  },

  onStepNext: function() {
    // TODO: Go to some sort of overview page
    //this.communityCreateModel.set('stepState', this.communityCreateModel.STEP_CONSTANT_MAP.invite);
  },
  onStepBack: function() {
    this.communityCreateModel.set('stepState', this.communityCreateModel.STEP_CONSTANT_MAP.main);
  },
});
