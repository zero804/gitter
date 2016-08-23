'use strict';

var Marionette = require('backbone.marionette');
var cocktail = require('backbone.cocktail');
var toggleClass = require('utils/toggle-class');
var appEvents = require('utils/appevents');
var KeyboardEventMixin = require('views/keyboard-events-mixin');
var template = require('./community-create-view.hbs');
var stepConstants = require('./step-constants');
var CommunityCreateStepViewModel = require('./community-create-step-view-model');
var CommunityCreatMainStepViewModel = require('./main-step/community-create-main-step-view-model');
var CommunityCreateGitHubProjectsStepViewModel = require('./github-projects-step/community-create-github-projects-step-view-model');
var CommunityCreationMainView = require('./main-step/community-creation-main-view');
var CommunityCreationGithubProjectsView = require('./github-projects-step/community-creation-github-projects-view');
var CommunityCreationInvitePeopleView = require('./invite-step/community-creation-invite-people-view');
var CommunityCreationInviteConfirmationView = require('./invite-confirmation-step/community-creation-invite-confirmation-view');
var CommunityCreationOverviewView = require('./overview-step/community-creation-overview-view');

require('views/behaviors/isomorphic');

var CommunityCreateView = Marionette.LayoutView.extend({
  template: template,

  className: 'community-create-root-inner',

  ui: {
    close: '.js-community-create-close'
  },

  behaviors: {
    Isomorphic: {
      mainStepView: { el: '.js-community-create-main-step-root', init: 'initMainStepView' },
      invitePeopleStepView: { el: '.js-community-create-invite-people-step-root', init: 'initInvitePeopleView' },
      inviteConfirmationStepView: { el: '.js-community-create-invite-confirmation-step-root', init: 'initInviteConfirmationView' },
      githubProjectsStepView: { el: '.js-community-create-github-projects-step-root', init: 'initGitHubProjectsView' },
      overviewStepView: { el: '.js-community-create-overview-step-root', init: 'initOverviewView' },
    },
  },

  initMainStepView: function(optionsForRegion) {
    this.mainStepView = new CommunityCreationMainView(optionsForRegion({
      model: this.mainStepViewModel,
      communityCreateModel: this.model
    }));

    return this.mainStepView;
  },

  initGitHubProjectsView: function(optionsForRegion) {
    this.githubProjectsStepView = new CommunityCreationGithubProjectsView(optionsForRegion({
      model: this.githubProjectsStepViewModel,
      communityCreateModel: this.model
    }));

    return this.githubProjectsStepView;
  },

  initInvitePeopleView: function(optionsForRegion) {
    this.invitePeopleStepView = new CommunityCreationInvitePeopleView(optionsForRegion({
      model: this.invitePeopleStepViewModel,
      communityCreateModel: this.model
    }));

    return this.invitePeopleStepView;
  },

  initInviteConfirmationView: function(optionsForRegion) {
    this.invitePeopleStepView = new CommunityCreationInviteConfirmationView(optionsForRegion({
      model: this.inviteConfirmationStepViewModel,
      communityCreateModel: this.model,
    }));
    return this.invitePeopleStepView;
  },

  initOverviewView: function(optionsForRegion) {
    this.overviewStepView = new CommunityCreationOverviewView(optionsForRegion({
      model: this.overviewStepViewModel,
      communityCreateModel: this.model,
    }));
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

    this.invitePeopleStepViewModel = new CommunityCreateStepViewModel({
      communityCreateModel: communityCreateModel,
      active: false
    });

    this.inviteConfirmationStepViewModel = new CommunityCreateStepViewModel({
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
    this.githubProjectsStepViewModel.set({ active: newStepState === stepConstants.GITHUB_PROJECTS });
    this.invitePeopleStepViewModel.set({ active: newStepState === stepConstants.INVITE });
    this.inviteConfirmationStepViewModel.set({ active: newStepState === stepConstants.INVITE_CONFIRMATION });
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
  },

});


cocktail.mixin(CommunityCreateView, KeyboardEventMixin);

module.exports = CommunityCreateView;
