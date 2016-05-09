'use strict';

var Marionette = require('backbone.marionette');
var toggleClass = require('utils/toggle-class');

require('views/behaviors/isomorphic');

var template = require('./community-create-view.hbs');

var CommunityCreateStepViewModel = require('./community-create-step-view-model');
var CommunityCreateGitHubProjectsStepViewModel = require('./community-create-github-projects-step-view-model');

var ActiveCollection = require('./active-collection');
var troupeCollections = require('collections/instances/troupes');
var orgsCollection = troupeCollections.orgs;
var repoModels = require('collections/repos');
var ReposCollection = repoModels.ReposCollection;

var CommunityCreationMainView = require('./views/community-creation-main-view');
var CommunityCreationGithubProjectsView = require('./views/community-creation-github-projects-view');
var CommunityCreationInvitePeopleView = require('./views/community-creation-invite-people-view');
var CommunityCreationOverviewView = require('./views/community-creation-overview-view');



module.exports = Marionette.LayoutView.extend({
  template: template,

  attributes: {
    class: 'community-create-root-inner'
  },

  ui: {
    close: '.js-community-create-close'
  },

  behaviors: {
    Isomorphic: {
      mainStepView: { el: '.community-create-main-step-root', init: 'initMainStepView' },
      invitePeopleStepView: { el: '.community-create-invite-people-step-root', init: 'initInvitePeopleView' },
      githubProjectsStepView: { el: '.community-create-github-projects-step-root', init: 'initGitHubProjectsView' },
      overviewStepView: { el: '.community-create-overview-step-root', init: 'initOverviewView' },
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
      communityCreateModel: this.model,
      orgsCollection: this.orgsCollection,
      reposCollection: this.reposCollection
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

  initOverviewView: function(optionsForRegion) {
    this.overviewStepView = new CommunityCreationOverviewView(optionsForRegion({
      model: this.overviewStepViewModel,
      communityCreateModel: this.model,
      orgsCollection: this.orgsCollection,
      reposCollection: this.reposCollection
    }));
    return this.overviewStepView;
  },

  events: {
    'click @ui.close': 'onViewCloseClicked'
  },

  modelEvents: {
    'change:active': 'onActiveChange',
    'change:stepState': 'onStepChangeState'
  },

  initialize: function() {
    this.orgsCollection = new ActiveCollection(orgsCollection.models, {
      collection: orgsCollection
    });

    var backingReposCollection = new ReposCollection();
    backingReposCollection.fetch();
    this.reposCollection = new ActiveCollection(backingReposCollection.models, {
      collection: backingReposCollection
    });

    this.mainStepViewModel = new CommunityCreateStepViewModel({ active: true });
    this.githubProjectsStepViewModel = new CommunityCreateGitHubProjectsStepViewModel({ active: false });
    this.invitePeopleStepViewModel = new CommunityCreateStepViewModel({ active: false });
    this.overviewStepViewModel = new CommunityCreateStepViewModel({ active: false });
  },

  onStepChangeState: function() {
    var newStepState = this.model.get('stepState');
    var stepConstants = this.model.STEP_CONSTANT_MAP;

    var stepActiveMap = Object.keys(stepConstants).reduce(function(map, stepKey) {
      var stepConstant = stepConstants[stepKey];
      var value = false;
      if(newStepState === stepConstant) {
        value = true;
      }
      map[stepConstant] = value;
      return map;
    }, {});

    this.mainStepViewModel.set({ active: stepActiveMap[stepConstants.main] });
    this.githubProjectsStepViewModel.set({ active: stepActiveMap[stepConstants.githubProjects] });
    this.invitePeopleStepViewModel.set({ active: stepActiveMap[stepConstants.invite] });
    this.overviewStepViewModel.set({ active: stepActiveMap[stepConstants.overview] });
  },

  onActiveChange: function() {
    toggleClass(this.$el[0], 'active', this.model.get('active'));
  },

  onViewCloseClicked: function() {
    this.model.set('active', false);
  }
});
