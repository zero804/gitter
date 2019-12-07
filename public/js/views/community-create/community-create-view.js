'use strict';

var Marionette = require('backbone.marionette');
var cocktail = require('backbone.cocktail');
var toggleClass = require('../../utils/toggle-class');
var appEvents = require('../../utils/appevents');
var KeyboardEventMixin = require('../keyboard-events-mixin');
var template = require('./community-create-view.hbs');
var stepConstants = require('./step-constants');
var CommunityCreateStepViewModel = require('./community-create-step-view-model');
var CommunityCreatMainStepViewModel = require('./main-step/community-create-main-step-view-model');
var CommunityCreateGitHubProjectsStepViewModel = require('./github-projects-step/community-create-github-projects-step-view-model');
var CommunityCreationMainView = require('./main-step/community-creation-main-view');
var CommunityCreationGithubProjectsView = require('./github-projects-step/community-creation-github-projects-view');
var CommunityCreationOverviewView = require('./overview-step/community-creation-overview-view');

require('../behaviors/isomorphic');

var CommunityCreateView = Marionette.LayoutView.extend({
  template: template,

  className: 'community-create-root-inner',

  ui: {
    close: '.js-community-create-close'
  },

  behaviors: {
    Isomorphic: {
      mainStepView: { el: '.js-community-create-main-step-root', init: 'initMainStepView' },
      githubProjectsStepView: {
        el: '.js-community-create-github-projects-step-root',
        init: 'initGitHubProjectsView'
      },
      overviewStepView: { el: '.js-community-create-overview-step-root', init: 'initOverviewView' }
    }
  },

  initMainStepView: function(optionsForRegion) {
    this.mainStepView = new CommunityCreationMainView(
      optionsForRegion({
        model: this.mainStepViewModel,
        communityCreateModel: this.model
      })
    );

    return this.mainStepView;
  },

  initGitHubProjectsView: function(optionsForRegion) {
    this.githubProjectsStepView = new CommunityCreationGithubProjectsView(
      optionsForRegion({
        model: this.githubProjectsStepViewModel,
        communityCreateModel: this.model
      })
    );

    return this.githubProjectsStepView;
  },

  initOverviewView: function(optionsForRegion) {
    this.overviewStepView = new CommunityCreationOverviewView(
      optionsForRegion({
        model: this.overviewStepViewModel,
        communityCreateModel: this.model
      })
    );
    return this.overviewStepView;
  },

  events: {
    'click @ui.close': 'closeView'
  },

  keyboardEvents: {
    'document.escape': 'closeView'
  },

  modelEvents: {
    'change:stepState': 'onStepChangeState'
  },

  initialize: function() {
    var communityCreateModel = this.model;

    this.mainStepViewModel = new CommunityCreatMainStepViewModel({
      communityCreateModel: communityCreateModel,
      active: true
    });

    this.githubProjectsStepViewModel = new CommunityCreateGitHubProjectsStepViewModel({
      communityCreateModel: communityCreateModel,
      active: false
    });

    this.overviewStepViewModel = new CommunityCreateStepViewModel({
      communityCreateModel: communityCreateModel,
      active: false
    });
  },

  onStepChangeState: function() {
    var newStepState = this.model.get('stepState');

    appEvents.trigger('stats.event', 'community.create.active.' + this.model.get('stepState'));
    appEvents.trigger('track-event', 'community.create.active.' + this.model.get('stepState'));

    this.mainStepViewModel.set({ active: newStepState === stepConstants.MAIN });
    this.githubProjectsStepViewModel.set({
      active: newStepState === stepConstants.GITHUB_PROJECTS
    });
    this.overviewStepViewModel.set({ active: newStepState === stepConstants.OVERVIEW });
  },

  closeView: function() {
    this.model.set('active', false);
  },

  onRender: function() {
    toggleClass(this.$el[0], 'active', true);
  },

  show: function() {
    this.render();

    var rootWrapperElement = document.createElement('div');
    rootWrapperElement.classList.add('community-create-app-root');
    rootWrapperElement.appendChild(this.el);
    document.body.appendChild(rootWrapperElement);
  },

  hideInternal: function() {
    this.destroy();
  },

  /* Called after navigation to destroy an navigable dialog box */
  navigationalHide: function() {
    this.hideInternal();
  }
});

cocktail.mixin(CommunityCreateView, KeyboardEventMixin);

module.exports = CommunityCreateView;
