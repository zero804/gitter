'use strict';

var _ = require('underscore');
var Marionette = require('backbone.marionette');
var slugify = require('slug');
var toggleClass = require('utils/toggle-class');

var CommunityCreateBaseStepView = require('./community-creation-base-step-view');
var template = require('./community-creation-main-view.hbs');

require('gitter-styleguide/css/components/headings.css');
require('gitter-styleguide/css/components/buttons.css');

var updateElementValueAndMaintatinSelection = function(el, newValue) {
  var start = el.selectionStart;
  var end = el.selectionEnd;

  el.value = newValue;

  // Restore selection
  if(el === document.activeElement) {
    el.setSelectionRange(start, end);
  }
};


module.exports = CommunityCreateBaseStepView.extend({
  template: template,

  attributes: _.extend({}, CommunityCreateBaseStepView.prototype.attributes, {
    class: 'community-create-step-wrapper community-create-main-step-wrapper'
  }),

  ui: _.extend({}, CommunityCreateBaseStepView.prototype.ui, {
    communityNameInput: '.primary-community-name-input',
    communitySlugInput: '.community-creation-slug-input',
    githubProjectLink: '.js-community-create-from-github-project-link'
  }),

  events: _.extend({}, CommunityCreateBaseStepView.prototype.events, {
    'click @ui.nextStep': 'onStepNext',
    'input @ui.communityNameInput': 'onCommunityNameInputChange',
    'input @ui.communitySlugInput': 'onCommunitSlugInputChange',
    'click @ui.githubProjectLink': 'onGitHubProjectLinkActivated'
  }),

  modelEvents: _.extend({}, CommunityCreateBaseStepView.prototype.modelEvents, {
    'change:communityName': 'updateCommunityFields'
  }),

  initialize: function() {
    CommunityCreateBaseStepView.prototype.initialize.apply(this, arguments);

    this.listenTo(this.communityCreateModel, 'change:communityName', this.updateCommunityFields, this);
    this.listenTo(this.communityCreateModel, 'change:communitySlug', this.updateCommunityFields, this);
  },

  onStepNext: function() {
    this.communityCreateModel.set('stepState', this.communityCreateModel.STEP_CONSTANT_MAP.invite);
  },

  onGitHubProjectLinkActivated: function() {
    // Move to the pick github project views
    this.communityCreateModel.set('stepState', this.communityCreateModel.STEP_CONSTANT_MAP.githubProjects);
  },

  updateCommunityFields: function() {
    updateElementValueAndMaintatinSelection(this.ui.communityNameInput[0], this.communityCreateModel.get('communityName'));
    updateElementValueAndMaintatinSelection(this.ui.communitySlugInput[0], this.communityCreateModel.get('communitySlug'));
  },

  onCommunityNameInputChange: function() {
    var currentSlug = this.communityCreateModel.get('communitySlug');
    var isUsingCustomSlug = this.communityCreateModel.get('isUsingCustomSlug');

    var newCommunityName = this.ui.communityNameInput[0].value;
    this.communityCreateModel.set({
      communityName: newCommunityName
    });

    var isSlugEmpty = !currentSlug || currentSlug.length === 0;
    if(isSlugEmpty || !isUsingCustomSlug) {
      this.communityCreateModel.set({
        communitySlug: slugify(newCommunityName),
        // Reset back if we started doing an automatic slug again
        isUsingCustomSlug: isSlugEmpty ? false : isUsingCustomSlug
      });
    }
  },

  onCommunitSlugInputChange: function() {
    var newSlug = this.ui.communitySlugInput[0].value;
    this.communityCreateModel.set({
      isUsingCustomSlug: true,
      communitySlug: newSlug
    });
  },
});
