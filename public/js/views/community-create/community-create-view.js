'use strict';

var Marionette = require('backbone.marionette');
var cocktail = require('cocktail');
var toggleClass = require('utils/toggle-class');
var KeyboardEventMixin = require('views/keyboard-events-mixin');

require('views/behaviors/isomorphic');

var template = require('./community-create-view.hbs');

var stepConstants = require('./step-constants');
var CommunityCreateStepViewModel = require('./community-create-step-view-model');
var CommunityCreatMainStepViewModel = require('./main-step/community-create-main-step-view-model');
var CommunityCreateGitHubProjectsStepViewModel = require('./github-projects-step/community-create-github-projects-step-view-model');


var ActiveCollection = require('./active-collection');

var CommunityCreationMainView = require('./main-step/community-creation-main-view');
var CommunityCreationGithubProjectsView = require('./github-projects-step/community-creation-github-projects-view');
var CommunityCreationInvitePeopleView = require('./invite-step/community-creation-invite-people-view');
var CommunityCreationOverviewView = require('./overview-step/community-creation-overview-view');



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
      githubProjectsStepView: { el: '.js-community-create-github-projects-step-root', init: 'initGitHubProjectsView' },
      overviewStepView: { el: '.js-community-create-overview-step-root', init: 'initOverviewView' },
    },
  },

  initMainStepView: function(optionsForRegion) {
    this.mainStepView = new CommunityCreationMainView(optionsForRegion({
      model: this.mainStepViewModel,
      communityCreateModel: this.model,
      orgCollection: this.orgCollection,
      repoCollection: this.repoCollection
    }));
    return this.mainStepView;
  },

  initGitHubProjectsView: function(optionsForRegion) {
    this.githubProjectsStepView = new CommunityCreationGithubProjectsView(optionsForRegion({
      model: this.githubProjectsStepViewModel,
      communityCreateModel: this.model,
      orgCollection: this.orgCollection,
      repoCollection: this.repoCollection
    }));
    return this.githubProjectsStepView;
  },

  initInvitePeopleView: function(optionsForRegion) {
    this.invitePeopleStepView = new CommunityCreationInvitePeopleView(optionsForRegion({
      model: this.invitePeopleStepViewModel,
      communityCreateModel: this.model,
      orgCollection: this.orgCollection,
      repoCollection: this.repoCollection
    }));
    return this.invitePeopleStepView;
  },

  initOverviewView: function(optionsForRegion) {
    this.overviewStepView = new CommunityCreationOverviewView(optionsForRegion({
      model: this.overviewStepViewModel,
      communityCreateModel: this.model,
      orgCollection: this.orgCollection,
      repoCollection: this.repoCollection,
      groupsCollection: this.groupsCollection
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
    'change:active': 'onActiveChange',
    'change:stepState': 'onStepChangeState'
  },

  initialize: function(options) {
    var orgCollection = options.orgCollection;
    var repoCollection = options.repoCollection;

    this.orgCollection = new ActiveCollection(orgCollection.models, {
      collection: orgCollection
    });

    this.repoCollection = new ActiveCollection(repoCollection.models, {
      collection: repoCollection
    });

    this.groupsCollection = options.groupsCollection;

    this.mainStepViewModel = new CommunityCreatMainStepViewModel({
      communityCreateModel: this.model,
      active: true
    });
    this.githubProjectsStepViewModel = new CommunityCreateGitHubProjectsStepViewModel({
      communityCreateModel: this.model,
      active: false
    });
    this.invitePeopleStepViewModel = new CommunityCreateStepViewModel({
      communityCreateModel: this.model,
      active: false
    });
    this.overviewStepViewModel = new CommunityCreateStepViewModel({
      communityCreateModel: this.model,
      active: false
    });
  },

  onStepChangeState: function() {
    var newStepState = this.model.get('stepState');

    this.mainStepViewModel.set({ active: newStepState === stepConstants.MAIN });
    this.githubProjectsStepViewModel.set({ active: newStepState === stepConstants.GITHUB_PROJECTS });
    this.invitePeopleStepViewModel.set({ active: newStepState === stepConstants.INVITE });
    this.overviewStepViewModel.set({ active: newStepState === stepConstants.OVERVIEW });
  },

  onActiveChange: function() {
    toggleClass(this.$el[0], 'active', this.model.get('active'));
  },

  closeView: function() {
    this.model.set('active', false);
  }
});


cocktail.mixin(CommunityCreateView, KeyboardEventMixin);

module.exports = CommunityCreateView;
