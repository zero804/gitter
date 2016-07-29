'use strict';

var _ = require('underscore');
var slugify = require('slug');
var context = require('utils/context');
var toggleClass = require('utils/toggle-class');
var apiClient = require('components/apiClient');

var stepConstants = require('../step-constants');
var slugAvailabilityStatusConstants = require('../slug-availability-status-constants');
var template = require('./community-creation-main-view.hbs');
var CommunityCreateBaseStepView = require('../shared/community-creation-base-step-view');

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


var _super = CommunityCreateBaseStepView.prototype;

module.exports = CommunityCreateBaseStepView.extend({
  template: template,

  className: 'community-create-step-wrapper community-create-main-step-wrapper',

  ui: _.extend({}, _super.ui, {
    mainForm: '.js-community-create-main-view-form',
    communityNameInput: '.primary-community-name-input',
    communitySlugInput: '.community-creation-slug-input',
    communitySlugInputWrapper: '.community-creation-slug-input-wrapper',
    githubProjectLink: '.js-community-create-from-github-project-link',

    addAssociatedProjectCopy: '.js-community-create-add-associated-project-copy',
    hasAssociatedProjectCopy: '.js-community-create-has-associated-project-copy',
    associatedProjectLink: '.js-community-create-associated-project-link',
    associatedProjectName: '.js-community-create-associated-project-name',
    associatedProjectBadgerOption: '.js-community-create-associated-project-badger-option',
    associatedProjectBadgerOptionInput: '.js-community-create-associated-project-badger-option-input'
  }),

  events: _.extend({}, _super.events, {
    'submit @ui.mainForm': 'onStepNext',
    'input @ui.communityNameInput': 'onCommunityNameInputChange',
    'input @ui.communitySlugInput': 'onCommunitSlugInputChange',
    'click @ui.githubProjectLink': 'onGitHubProjectLinkActivated',
    'change @ui.associatedProjectBadgerOptionInput': 'onBadgerInputChange'
  }),

  modelEvents: _.extend({}, _super.modelEvents, {

  }),

  initialize: function(options) {
    _super.initialize.apply(this, arguments);

    this.orgCollection = options.orgCollection;
    this.repoCollection = options.repoCollection;


    var user = context.getUser();
    this.hasGitHubProvider = user && user.providers && user.providers.some(function(provider) {
      return provider === 'github';
    });

    this.listenTo(this.communityCreateModel, 'change:communityName change:communitySlug', this.onCommunityInfoChange, this);
    this.listenTo(this.communityCreateModel, 'change:communitySlugAvailabilityStatus', this.updateSlugAvailabilityStatusIndicator, this);
  },


  serializeData: function() {
    var data = this.model.toJSON();
    data.hasGitHubProvider = this.hasGitHubProvider;

    return data;
  },

  onStepNext: function(e) {
    if(this.model.isValid()) {
      this.communityCreateModel.set('stepState', stepConstants.INVITE);
    }

    e.preventDefault();
  },

  applyValidMessages: function(isValid, isAfterRender) {
    _super.applyValidMessages.apply(this, arguments);

    var communityNameErrorMessage = '';
    var communitySlugErrorMessage = '';
    if(!isValid && isAfterRender !== true) {
      (this.model.validationError || []).forEach(function(validationError) {
        if(validationError.key === 'communityName') {
          communityNameErrorMessage = validationError.message;
        }
        if(validationError.key === 'communitySlug') {
          communitySlugErrorMessage = validationError.message;
        }
      });
    }

    this.ui.communityNameInput[0].setCustomValidity(communityNameErrorMessage);
    this.ui.communitySlugInput[0].setCustomValidity(communitySlugErrorMessage);
  },

  onGitHubProjectLinkActivated: function(e) {
    // Move to the pick github project views
    this.communityCreateModel.set('stepState', stepConstants.GITHUB_PROJECTS);

    e.preventDefault();
    e.stopPropagation();
  },

  onCommunityInfoChange: function() {
    if(!this.communityCreateModel.get('isUsingExplicitGitHubProject')) {
      var communitySlug = this.communityCreateModel.get('communitySlug');
      // TODO: Why does this match the first item always?
      var matchingOrgItem = this.orgCollection.filter(function(org) {
        return (org.get('name') || '').toLowerCase() === communitySlug;
      })[0];
      var matchingRepoItem = this.repoCollection.filter(function(repo) {
        return (repo.get('uri') || '').toLowerCase() === communitySlug;
      })[0];
      if(matchingOrgItem) {
        this.communityCreateModel.set('githubOrgId', matchingOrgItem.get('id'));
        this.communityCreateModel.set('githubRepoId', null);
      }
      else if(matchingRepoItem) {
        this.communityCreateModel.set('githubOrgId', null);
        this.communityCreateModel.set('githubRepoId', matchingRepoItem.get('id'));
      }
      else {
        this.communityCreateModel.set('githubOrgId', null);
        this.communityCreateModel.set('githubRepoId', null);
      }
    }

    this.updateCommunityFields();
  },

  updateCommunityFields: function() {
    var communityName = this.communityCreateModel.get('communityName');
    var communitySlug = this.communityCreateModel.get('communitySlug');

    updateElementValueAndMaintatinSelection(this.ui.communityNameInput[0], communityName);
    updateElementValueAndMaintatinSelection(this.ui.communitySlugInput[0], communitySlug);

    if(this.hasGitHubProvider) {
      var githubProjectInfo = this.communityCreateModel.getGithubProjectInfo(this.orgCollection, this.repoCollection);
      this.ui.associatedProjectName[0].textContent = githubProjectInfo.name;
      this.ui.associatedProjectLink[0].setAttribute('href', githubProjectInfo.url);
      toggleClass(this.ui.addAssociatedProjectCopy[0], 'active', !githubProjectInfo.name);
      toggleClass(this.ui.hasAssociatedProjectCopy[0], 'active', !!githubProjectInfo.name);

      var isBackedByRepo = !!this.communityCreateModel.get('githubRepoId');
      toggleClass(this.ui.associatedProjectBadgerOption[0], 'active', isBackedByRepo);
    }

    this.checkSlugAvailability();
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

  checkSlugAvailability: _.throttle(function() {
    var communityCreateModel = this.communityCreateModel;
    var model = this.model;
    var slug = communityCreateModel.get('communitySlug');

    communityCreateModel.set('communitySlugAvailabilityStatus', slugAvailabilityStatusConstants.PENDING);
    apiClient.priv.get('/check-group-uri', {
        uri: slug
      })
      .then(function() {
        communityCreateModel.set('communitySlugAvailabilityStatus', slugAvailabilityStatusConstants.AVAILABLE);
        model.isValid();
      })
      .catch(function(err) {
        var status = err.status;
        if(status === 409) {
          communityCreateModel.set('communitySlugAvailabilityStatus', slugAvailabilityStatusConstants.UNAVAILABLE);
        }
        else {
          communityCreateModel.set('communitySlugAvailabilityStatus', slugAvailabilityStatusConstants.INVALID);
        }
        model.isValid();
      });
  }, 300),


  updateSlugAvailabilityStatusIndicator: function() {
    var status = this.communityCreateModel.get('communitySlugAvailabilityStatus');

    this.ui.communitySlugInputWrapper.toggleClass('pending', status === slugAvailabilityStatusConstants.PENDING);
    this.ui.communitySlugInputWrapper.toggleClass('available', status === slugAvailabilityStatusConstants.AVAILABLE);
    this.ui.communitySlugInputWrapper.toggleClass('unavailable', status === slugAvailabilityStatusConstants.UNAVAILABLE || status === slugAvailabilityStatusConstants.INVALID);
  }
});