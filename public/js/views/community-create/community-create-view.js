'use strict';

var Marionette = require('backbone.marionette');
var SimpleFilteredCollection = require('../../collections/simple-filtered-collection');
var cocktail = require('backbone.cocktail');
var toggleClass = require('../../utils/toggle-class');
var appEvents = require('../../utils/appevents');
var KeyboardEventMixin = require('../keyboard-events-mixin');
var VirtualMultipleCollection = require('./virtual-multiple-collection');

require('../behaviors/isomorphic');

var template = require('./community-create-view.hbs');

var stepConstants = require('./step-constants');
var peopleToInviteStatusConstants = require('./people-to-invite-status-constants');
var CommunityCreateStepViewModel = require('./community-create-step-view-model');
var CommunityCreatMainStepViewModel = require('./main-step/community-create-main-step-view-model');
var CommunityCreateGitHubProjectsStepViewModel = require('./github-projects-step/community-create-github-projects-step-view-model');


var ActiveCollection = require('./active-collection');

var CommunityCreationMainView = require('./main-step/community-creation-main-view');
var CommunityCreationGithubProjectsView = require('./github-projects-step/community-creation-github-projects-view');
var CommunityCreationInvitePeopleView = require('./invite-step/community-creation-invite-people-view');
var CommunityCreationInviteConfirmationView = require('./invite-confirmation-step/community-creation-invite-confirmation-view');
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
      inviteConfirmationStepView: { el: '.js-community-create-invite-confirmation-step-root', init: 'initInviteConfirmationView' },
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
      unusedOrgCollection: this.unusedOrgCollection,
      repoCollection: this.repoCollection,
      unusedRepoCollection: this.unusedRepoCollection
    }));
    return this.githubProjectsStepView;
  },

  initInvitePeopleView: function(optionsForRegion) {
    this.invitePeopleStepView = new CommunityCreationInvitePeopleView(optionsForRegion({
      model: this.invitePeopleStepViewModel,
      communityCreateModel: this.model,
      orgCollection: this.orgCollection,
      repoCollection: this.repoCollection,
      inviteCollection: this.inviteCollection,
      troubleInviteCollection: this.troubleInviteCollection
    }));
    return this.invitePeopleStepView;
  },

  initInviteConfirmationView: function(optionsForRegion) {
    this.invitePeopleStepView = new CommunityCreationInviteConfirmationView(optionsForRegion({
      model: this.inviteConfirmationStepViewModel,
      communityCreateModel: this.model,
      troubleInviteCollection: this.troubleInviteCollection
    }));
    return this.invitePeopleStepView;
  },

  initOverviewView: function(optionsForRegion) {
    this.overviewStepView = new CommunityCreationOverviewView(optionsForRegion({
      model: this.overviewStepViewModel,
      communityCreateModel: this.model,
      orgCollection: this.orgCollection,
      repoCollection: this.repoCollection,
      groupsCollection: this.groupsCollection,
      inviteCollection: this.inviteCollection,
      troubleInviteCollection: this.troubleInviteCollection
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
    var unusedOrgCollection = options.unusedOrgCollection;
    var repoCollection = options.repoCollection;
    var unusedRepoCollection = options.unusedRepoCollection

    this.orgCollection = new ActiveCollection(orgCollection.models, {
      collection: orgCollection
    });
    this.unusedOrgCollection = new ActiveCollection(unusedOrgCollection.models, {
      collection: unusedOrgCollection
    });

    this.repoCollection = new ActiveCollection(repoCollection.models, {
      collection: repoCollection
    });
    this.unusedRepoCollection = new ActiveCollection(unusedRepoCollection.models, {
      collection: unusedRepoCollection
    });

    this.groupsCollection = options.groupsCollection;


    this.inviteCollection = new VirtualMultipleCollection([], {
      backingCollections: [
        this.model.peopleToInvite,
        this.model.emailsToInvite
      ]
    });

    this.troubleInviteCollection = new SimpleFilteredCollection([], {
      collection: this.inviteCollection,
      filter: function(model) {
        // Anyone who isn't ready or can't be covered by the Twitter Badger
        return model.get('inviteStatus') !== peopleToInviteStatusConstants.READY && model.get('type') !== 'twitter';
      }
    });


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
    this.inviteConfirmationStepViewModel = new CommunityCreateStepViewModel({
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

    appEvents.trigger('stats.event', 'community.create.active.' + this.model.get('stepState'));
    appEvents.trigger('track-event', 'community.create.active.' + this.model.get('stepState'));
    this.mainStepViewModel.set({ active: newStepState === stepConstants.MAIN });
    this.githubProjectsStepViewModel.set({ active: newStepState === stepConstants.GITHUB_PROJECTS });
    this.invitePeopleStepViewModel.set({ active: newStepState === stepConstants.INVITE });
    this.inviteConfirmationStepViewModel.set({ active: newStepState === stepConstants.INVITE_CONFIRMATION });
    this.overviewStepViewModel.set({ active: newStepState === stepConstants.OVERVIEW });
  },

  onActiveChange: function() {
    var isActive = this.model.get('active');
    toggleClass(this.$el[0], 'active', isActive);

    if(isActive) {
      appEvents.trigger('stats.event', 'community.create.enter');
      appEvents.trigger('track-event', 'community.create.enter');
    }

    // Reset for next time if we are hiding create community
    if(!isActive) {
     this.model.reset({ silent: true });
    }
  },

  closeView: function() {
    appEvents.trigger('stats.event', 'community.create.exit.' + this.model.get('stepState'));
    appEvents.trigger('track-event', 'community.create.exit.' + this.model.get('stepState'));
    this.model.set('active', false);
    window.location.hash = '#';
  },

  onRender: function() {
    this.onActiveChange();
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

  navigationalHide: function() {
    this.closeView();
  }
});


cocktail.mixin(CommunityCreateView, KeyboardEventMixin);

module.exports = CommunityCreateView;
