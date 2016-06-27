'use strict';

var _ = require('underscore');
var slugify = require('slug');
var context = require('utils/context');
var toggleClass = require('utils/toggle-class');

var stepConstants = require('../step-constants');
var template = require('./community-creation-main-view.hbs');
var CommunityCreateBaseStepView = require('../shared/community-creation-base-step-view');
var CommunityCreationSubRoomListView = require('../shared/community-creation-sub-room-list-view');

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

// Consider all constraints except a customError because we use
// this to add a custom message on what to do to satisfy
var isFormElementInvalid = function(el, useCustomError) {
  return el.validity.badInput ||
    (useCustomError ? el.validity.customError : false) ||
    el.validity.patternMismatch ||
    el.validity.rangeOverflow ||
    el.validity.rangeUnderflow ||
    el.validity.stepMismatch ||
    el.validity.tooLong ||
    el.validity.typeMismatch ||
    //el.validity.valid ||
    el.validity.valueMissing;
};


module.exports = CommunityCreateBaseStepView.extend({
  template: template,

  className: 'community-create-step-wrapper community-create-main-step-wrapper',

  behaviors: {
    Isomorphic: {
      //subRoomListView: { el: '.community-create-sub-room-list-root', init: 'initSubRoomListView' },
    },
  },

  initSubRoomListView: function(optionsForRegion) {
    this.subRoomListView = new CommunityCreationSubRoomListView(optionsForRegion({
      collection: this.communityCreateModel.get('subRooms'),
      communityCreateModel: this.communityCreateModel
    }));
    return this.subRoomListView;
  },

  ui: _.extend({}, CommunityCreateBaseStepView.prototype.ui, {
    mainForm: '.js-community-create-main-view-form',
    communityNameInput: '.primary-community-name-input',
    communitySlugInput: '.community-creation-slug-input',
    githubProjectLink: '.js-community-create-from-github-project-link',

    addAssociatedProjectCopy: '.js-community-create-add-associated-project-copy',
    hasAssociatedProjectCopy: '.js-community-create-has-associated-project-copy',
    associatedProjectLink: '.js-community-create-associated-project-link',
    associatedProjectName: '.js-community-create-associated-project-name',

    //advancedOptionsButton: '.js-community-create-advanced-options-toggle',
    //advancedOptionsArea: '.community-create-advanced-options-section',
    //subRoomNameInput: '.community-creation-sub-room-input',
    //subRoomSubmitButton: '.community-creation-sub-room-submit-button',
    //subRoomInputPrefix: '.community-creation-sub-room-input-prefix'
  }),

  events: _.extend({}, CommunityCreateBaseStepView.prototype.events, {
    'submit @ui.mainForm': 'onStepNext',
    'click @ui.nextStep': 'validateStep',
    'input @ui.communityNameInput': 'onCommunityNameInputChange',
    'input @ui.communitySlugInput': 'onCommunitSlugInputChange',
    'click @ui.githubProjectLink': 'onGitHubProjectLinkActivated',

    //'click @ui.advancedOptionsButton': 'onAdvancedOptionsToggle',
    //'click @ui.subRoomSubmitButton': 'onSubRoomSubmit'
  }),

  modelEvents: _.extend({}, CommunityCreateBaseStepView.prototype.modelEvents, {

  }),

  initialize: function(options) {
    CommunityCreateBaseStepView.prototype.initialize.apply(this, arguments);

    this.orgCollection = options.orgCollection;
    this.repoCollection = options.repoCollection;

    this.listenTo(this.communityCreateModel, 'change:communityName change:communitySlug', this.updateCommunityFields, this);
    this.listenTo(this.communityCreateModel, 'change:communityName change:communitySlug', this.validateStep, this);
  },


  serializeData: function() {
    var data = this.model.toJSON();
    var user = context.getUser();
    var hasGitHubProvider = user.providers.some(function(provider) {
      return provider === 'github';
    });
    data.hasGitHubProvider = hasGitHubProvider;

    return data;
  },

  validateStep: function() {
    var hasCommunityName = this.communityCreateModel.get('communityName').length;
    var hasCommunitySlug = this.communityCreateModel.get('communitySlug').length;

    this.model.set({
      valid: hasCommunityName && hasCommunitySlug
    });
  },

  onStepNext: function(e) {
    this.validateStep();
    var isValid = this.model.get('valid');

    if(isValid) {
      this.communityCreateModel.set('stepState', stepConstants.INVITE);
    }

    e.preventDefault();
  },

  onGitHubProjectLinkActivated: function(e) {
    // Move to the pick github project views
    this.communityCreateModel.set('stepState', stepConstants.GITHUB_PROJECTS);

    e.preventDefault();
    e.stopPropagation();
  },

  updateCommunityFields: function() {
    var communityName = this.communityCreateModel.get('communityName');
    var communitySlug = this.communityCreateModel.get('communitySlug');

    updateElementValueAndMaintatinSelection(this.ui.communityNameInput[0], communityName);
    updateElementValueAndMaintatinSelection(this.ui.communitySlugInput[0], communitySlug);
    //this.ui.subRoomInputPrefix[0].textContent = communityName + ' /';

    var githubProjectInfo = this.communityCreateModel.getGithubProjectInfo(this.orgCollection, this.repoCollection);
    this.ui.associatedProjectName[0].textContent = githubProjectInfo.name;
    this.ui.associatedProjectLink[0].setAttribute('href', githubProjectInfo.url);
    toggleClass(this.ui.addAssociatedProjectCopy[0], 'active', !githubProjectInfo.name);
    toggleClass(this.ui.hasAssociatedProjectCopy[0], 'active', !!githubProjectInfo.name);
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
        communitySlug: slugify(newCommunityName.toLowerCase()),
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

    this.ui.communitySlugInput[0].setCustomValidity(isFormElementInvalid(this.ui.communitySlugInput[0]) ? 'Slug can only contain lowercase a-z and dashes -' : '');
  },

  /* * /
  onAdvancedOptionsToggle: function() {
    toggleClass(this.ui.advancedOptionsArea[0], 'active');
  },
  onSubRoomSubmit: function() {
    var subRoomName = this.ui.subRoomNameInput[0].value;
    if(subRoomName) {
      this.communityCreateModel.get('subRooms').add({
        name: subRoomName
      });
    }

    // Clear the input
    this.ui.subRoomNameInput[0].value = '';
  }
  /* */
});
