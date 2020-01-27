'use strict';

var _ = require('lodash');
var slugger = require('../../../utils/slugger');
var context = require('gitter-web-client-context');
var toggleClass = require('../../../utils/toggle-class');
var apiClient = require('../../../components/api-client');

var stepConstants = require('../step-constants');
var slugAvailabilityStatusConstants = require('../slug-availability-status-constants');
var template = require('./community-creation-main-view.hbs');
var CommunityCreateBaseStepView = require('../shared/community-creation-base-step-view');

require('@gitterhq/styleguide/css/components/headings.css');
require('@gitterhq/styleguide/css/components/buttons.css');

/**
 * Map validation keys to UI fields
 */
function mapValidations(model, uiMappings) {
  var modelIsValid = model.isValid();
  var errors = !modelIsValid && model.validationError;

  Object.keys(uiMappings).forEach(function(key) {
    var uiElement = uiMappings[key];
    var domElement = uiElement[0];
    if (!domElement) return;
    var message;
    if (modelIsValid) {
      message = '';
    } else {
      message = errors[key] || '';
    }

    domElement.setCustomValidity(message);
  });
}

function updateElementValueAndMaintatinSelection(el, newValue) {
  var start = el.selectionStart;
  var end = el.selectionEnd;

  el.value = newValue;

  // Restore selection
  if (el === document.activeElement) {
    el.setSelectionRange(start, end);
  }
}

var _super = CommunityCreateBaseStepView.prototype;

module.exports = CommunityCreateBaseStepView.extend({
  template: template,

  className: 'community-create-step-wrapper community-create-main-step-wrapper',

  ui: _.extend({}, _super.ui, {
    mainForm: '.js-community-create-main-view-form',
    communityNameInput: '.primary-community-name-input',
    communitySlugInput: '.community-creation-slug-input',
    communitySlugInputWrapper: '.community-creation-slug-input-wrapper',
    associatedProjectLink: '.js-community-create-from-associated-project-link',

    addAssociatedProjectCopy: '.js-community-create-add-associated-project-copy',
    hasAssociatedProjectCopy: '.js-community-create-has-associated-project-copy',
    associatedProjectLink: '.js-community-create-associated-project-link',
    associatedProjectName: '.js-community-create-associated-project-name',
    associatedProjectBadgerOption: '.js-community-create-associated-project-badger-option',
    associatedProjectBadgerOptionInput:
      '.js-community-create-associated-project-badger-option-input'
  }),

  events: _.extend({}, _super.events, {
    'submit @ui.mainForm': 'onStepNext',
    'input @ui.communityNameInput': 'onCommunityNameInputChange',
    'input @ui.communitySlugInput': 'onCommunitSlugInputChange',
    'click @ui.associatedProjectLink': 'onassociatedProjectLinkActivated',
    'change @ui.associatedProjectBadgerOptionInput': 'onBadgerInputChange'
  }),

  initialize: function() {
    _super.initialize.apply(this, arguments);

    this.hasGitHubProvider = context.hasProvider('github');
    this.hasGitlabProvider = context.hasProvider('gitlab');

    this.listenTo(
      this.communityCreateModel,
      'change:communityName change:communitySlug',
      this.onCommunityInfoChange,
      this
    );
    this.listenTo(
      this.communityCreateModel,
      'change:communitySlugAvailabilityStatus',
      this.onSlugAvailabilityStatusChange,
      this
    );
  },

  serializeData: function() {
    var data = this.model.toJSON();
    data.hasGitlabProvider = this.hasGitlabProvider;
    data.hasGitHubProvider = this.hasGitHubProvider;

    return data;
  },

  nextStep: function() {
    if (this.model.isValid()) {
      return stepConstants.OVERVIEW;
    }
  },

  applyValidMessages: function() {
    _super.applyValidMessages.call(this);

    mapValidations(this.model, {
      communityName: this.ui.communityNameInput,
      communitySlug: this.ui.communitySlugInput
    });
  },

  onassociatedProjectLinkActivated: function(e) {
    // Move to the pick github project views
    this.communityCreateModel.set('stepState', stepConstants.GITHUB_PROJECTS);

    e.preventDefault();
    e.stopPropagation();
  },

  onCommunityInfoChange: function() {
    this.communityCreateModel.updateGitHubInfoToMatchSlug();
    this.updateCommunityFields();
  },

  updateCommunityFields: function() {
    var communityName = this.communityCreateModel.get('communityName');
    var communitySlug = this.communityCreateModel.get('communitySlug');

    updateElementValueAndMaintatinSelection(this.ui.communityNameInput[0], communityName);
    updateElementValueAndMaintatinSelection(this.ui.communitySlugInput[0], communitySlug);

    if (this.hasGitHubProvider || this.hasGitlabProvider) {
      const selectedModel = this.communityCreateModel.get('selectedModel');

      const name = (selectedModel && selectedModel.get('name')) || '';
      const url = (selectedModel && selectedModel.get('absoluteUri')) || '';
      const type = selectedModel && selectedModel.get('type');
      const hasGitHubAssociation = !!type;
      const isBackedByRepo = type === 'GH_REPO';

      this.ui.associatedProjectName[0].textContent = name;
      this.ui.associatedProjectLink[0].setAttribute('href', url);
      toggleClass(this.ui.addAssociatedProjectCopy[0], 'active', !hasGitHubAssociation);
      toggleClass(this.ui.hasAssociatedProjectCopy[0], 'active', hasGitHubAssociation);
      toggleClass(this.ui.associatedProjectBadgerOption[0], 'active', isBackedByRepo);
    }

    this.checkSlugAvailabilityDebounced();
  },

  onCommunityNameInputChange: function() {
    var currentSlug = this.communityCreateModel.get('communitySlug');
    var isUsingCustomSlug = this.communityCreateModel.get('isUsingCustomSlug');

    var newCommunityName = this.ui.communityNameInput[0].value;
    this.communityCreateModel.set({
      communityName: newCommunityName
    });

    var isSlugEmpty = !currentSlug || currentSlug.length === 0;
    if (isSlugEmpty || !isUsingCustomSlug) {
      this.communityCreateModel.set({
        communitySlug: slugger(newCommunityName),
        // Reset back if we started doing an automatic slug again
        isUsingCustomSlug: isSlugEmpty ? false : isUsingCustomSlug
      });
    }

    this.model.isValid();
  },

  onCommunitSlugInputChange: function() {
    var newSlug = this.ui.communitySlugInput[0].value;
    this.communityCreateModel.set({
      isUsingCustomSlug: true,
      communitySlug: newSlug
    });

    this.model.isValid();
  },

  onBadgerInputChange: function() {
    this.communityCreateModel.set({
      allowBadger: this.ui.associatedProjectBadgerOptionInput[0].checked
    });
  },

  checkSlugAvailabilityDebounced: function() {
    this.communityCreateModel.set(
      'communitySlugAvailabilityStatus',
      slugAvailabilityStatusConstants.PENDING
    );
    this._checkSlugAvailabilityDebounced();
  },

  _checkSlugAvailabilityDebounced: _.debounce(function() {
    var communityCreateModel = this.communityCreateModel;
    var model = this.model;
    var slug = communityCreateModel.get('communitySlug');
    const selectedModel = communityCreateModel.get('selectedModel');
    const type = selectedModel && selectedModel.get('type');

    communityCreateModel.set(
      'communitySlugAvailabilityStatus',
      slugAvailabilityStatusConstants.PENDING
    );

    apiClient.priv
      .get('/check-group-uri', {
        uri: slug
      })
      .then(function(res) {
        // Check to make sure the type matches in the response to what we are trying to create
        //
        // Because of the nature of repo URLs `org/repo` and we only pull off the `repo` part,
        // we need to allow creation when nothing is at that URL
        if (res.type === type || (type === 'GH_REPO' && res.type === null)) {
          communityCreateModel.set(
            'communitySlugAvailabilityStatus',
            slugAvailabilityStatusConstants.AVAILABLE
          );
        } else {
          communityCreateModel.set(
            'communitySlugAvailabilityStatus',
            slugAvailabilityStatusConstants.UNAVAILABLE
          );
        }
        model.isValid();
      })
      .catch(function(err) {
        var status = err.status;
        if (status === 409) {
          communityCreateModel.set(
            'communitySlugAvailabilityStatus',
            slugAvailabilityStatusConstants.UNAVAILABLE
          );
        } else if (status === 403) {
          communityCreateModel.set(
            'communitySlugAvailabilityStatus',
            slugAvailabilityStatusConstants.GITHUB_CLASH
          );
        } else if (status === 401) {
          communityCreateModel.set(
            'communitySlugAvailabilityStatus',
            slugAvailabilityStatusConstants.AUTHENTICATION_FAILED
          );
        } else {
          communityCreateModel.set(
            'communitySlugAvailabilityStatus',
            slugAvailabilityStatusConstants.INVALID
          );
        }
        model.isValid();
      });
  }, 300),

  onSlugAvailabilityStatusChange: function() {
    this.updateSlugAvailabilityStatusIndicator();
  },

  updateSlugAvailabilityStatusIndicator: function() {
    var status = this.communityCreateModel.get('communitySlugAvailabilityStatus');

    this.ui.communitySlugInputWrapper.toggleClass(
      'pending',
      status === slugAvailabilityStatusConstants.PENDING
    );
    this.ui.communitySlugInputWrapper.toggleClass(
      'available',
      status === slugAvailabilityStatusConstants.AVAILABLE
    );
    this.ui.communitySlugInputWrapper.toggleClass(
      'unavailable',
      status === slugAvailabilityStatusConstants.GITHUB_CLASH ||
        status === slugAvailabilityStatusConstants.AUTHENTICATION_FAILED ||
        status === slugAvailabilityStatusConstants.UNAVAILABLE ||
        status === slugAvailabilityStatusConstants.INVALID
    );
  }
});
