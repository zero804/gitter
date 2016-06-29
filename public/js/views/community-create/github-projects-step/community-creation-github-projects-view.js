'use strict';

var _ = require('underscore');
var toggleClass = require('utils/toggle-class');
var context = require('utils/context');
var slugify = require('slug');
var fuzzysearch = require('fuzzysearch');
var FilteredCollection = require('backbone-filtered-collection');
var getRoomNameFromTroupeName = require('gitter-web-shared/get-room-name-from-troupe-name');

require('views/behaviors/isomorphic');

var stepConstants = require('../step-constants');
var template = require('./community-creation-github-projects-view.hbs');
var CommunityCreateBaseStepView = require('../shared/community-creation-base-step-view');
var CommunityCreationOrgListView = require('./community-creation-org-list-view');
var CommunityCreationRepoListView = require('./community-creation-repo-list-view');


require('gitter-styleguide/css/components/headings.css');
require('gitter-styleguide/css/components/buttons.css');


var _super = CommunityCreateBaseStepView.prototype;

module.exports = CommunityCreateBaseStepView.extend({
  template: template,

  behaviors: {
    Isomorphic: {
      orgListView: { el: '.community-create-org-list-root', init: 'initOrgListView' },
      repoListView: { el: '.community-create-repo-list-root', init: 'initRepoListView' },
    },
  },

  initOrgListView: function(optionsForRegion) {
    this.orgListView = new CommunityCreationOrgListView(optionsForRegion({
      collection: this.orgCollection
    }));
    this.listenTo(this.orgListView, 'org:activated', this.onOrgSelectionChange, this);
    this.listenTo(this.orgListView, 'org:cleared', this.onOrgSelectionChange, this);
    return this.orgListView;
  },

  initRepoListView: function(optionsForRegion) {
    this.repoListView = new CommunityCreationRepoListView(optionsForRegion({
      collection: this.filteredRepoCollection
    }));
    this.listenTo(this.repoListView, 'repo:activated', this.onRepoSelectionChange, this);
    this.listenTo(this.repoListView, 'repo:cleared', this.onRepoSelectionChange, this);
    return this.repoListView;
  },

  className: 'community-create-step-wrapper community-create-github-projects-step-wrapper',

  ui: _.extend({}, _super.ui, {
    orgsToggle: '.js-community-create-github-projects-toggle-orgs',
    reposToggle: '.js-community-create-github-projects-toggle-repos',
    orgsArea: '.js-community-create-github-projects-orgs-area',
    reposArea: '.js-community-create-github-projects-repos-area',
    repoFilterInput: '.primary-community-repo-name-filter-input',
    repoScopeMissingNote: '.community-create-repo-missing-note'
  }),

  events: _.extend({}, _super.events, {
    'click @ui.nextStep': 'onStepNext',
    'click @ui.backStep': 'onStepBack',
    'click @ui.orgsToggle': 'onOrgsAreaToggle',
    'click @ui.reposToggle': 'onReposAreaToggle',
    'input @ui.repoFilterInput': 'onRepoFilterInputChange'
  }),

  modelEvents: _.extend({}, _super.modelEvents, {
    'change:isOrgAreaActive change:isRepoAreaActive': 'onAreaActiveChange',
    'change:repoFilter': 'onRepoFilterChange'
  }),

  initialize: function(options) {
    _super.initialize.apply(this, arguments);

    this.orgCollection = options.orgCollection;
    this.repoCollection = options.repoCollection;
    this.filteredRepoCollection = new FilteredCollection({
      collection: this.repoCollection
    });

    this.throttledApplyFilterToRepos = _.throttle(this.applyFilterToRepos, 500);
    this.shortThrottledApplyFilterToRepos = _.throttle(this.applyFilterToRepos, 100);

    this.listenTo(this.filteredRepoCollection, 'filter-complete', this.onRepoFilterComplete, this);
  },

  serializeData: function() {
    var data = this.model.toJSON();
    var user = context.getUser();
    data.isUserMissingPrivateRepoScope = user && !user.scopes.private_repo;

    return data;
  },

  onRender: function() {
    this.onAreaActiveChange();
  },

  setSelectedGitHubProjectCommunityState: function() {
    if(this.model.get('isOrgAreaActive')) {
      var selectedOrgId = this.model.get('selectedOrgId');
      var selectedOrgName = this.model.get('selectedOrgName') || '';
      this.communityCreateModel.set({
        communityName: selectedOrgName,
        communitySlug: slugify(selectedOrgName.toLowerCase()),
        isUsingCustomSlug: false,
        githubOrgId: selectedOrgId,
        githubRepoId: null
      });
    }
    else if(this.model.get('isRepoAreaActive')) {
      var selectedRepoId = this.model.get('selectedRepoId');
      var selectedRepoName = getRoomNameFromTroupeName(this.model.get('selectedRepoName') || '');
      this.communityCreateModel.set({
        communityName: selectedRepoName,
        communitySlug: slugify(selectedRepoName.toLowerCase()),
        isUsingCustomSlug: false,
        githubOrgId: null,
        githubRepoId: selectedRepoId
      });
    }
  },

  onStepNext: function() {
    this.communityCreateModel.set('stepState', stepConstants.MAIN);
  },
  onStepBack: function() {
    this.communityCreateModel.set('stepState', stepConstants.MAIN);
  },

  onOrgsAreaToggle: function() {
    this.setAreaActive('isOrgAreaActive');
  },
  onReposAreaToggle: function() {
    if(this.repoCollection.length === 0) {
      this.repoCollection.fetch();
    }

    this.setAreaActive('isRepoAreaActive');
  },

  onAreaActiveChange: function() {
    var isOrgAreaActive = this.model.get('isOrgAreaActive');
    var isRepoAreaActive = this.model.get('isRepoAreaActive');

    toggleClass(this.ui.orgsToggle[0], 'active', isOrgAreaActive);
    toggleClass(this.ui.reposToggle[0], 'active', isRepoAreaActive);

    toggleClass(this.ui.orgsArea[0], 'active', isOrgAreaActive);
    toggleClass(this.ui.reposArea[0], 'active', isRepoAreaActive);
  },

  setAreaActive: function(newActiveAreaKey) {
    this.model.set({
      isOrgAreaActive: newActiveAreaKey === 'isOrgAreaActive',
      isRepoAreaActive: newActiveAreaKey === 'isRepoAreaActive'
    });
  },

  onOrgSelectionChange: function(activeModel) {
    var selectedOrgId = null;
    var selectedOrgName = null;
    if(activeModel) {
       selectedOrgId = activeModel.get('id');
       selectedOrgName = activeModel.get('name');
    }

    this.model.set({
      selectedOrgId: selectedOrgId,
      selectedOrgName: selectedOrgName,
      selectedRepoId: null,
      selectedRepoName: null
    });

    this.setSelectedGitHubProjectCommunityState();
    // Clicking a org moves you onto the next step and fills in the data
    if(activeModel) {
      this.onStepNext();
    }
  },
  onRepoSelectionChange: function(activeModel) {
    var selectedRepoId = null;
    var selectedRepoName = null;
    if(activeModel) {
       selectedRepoId = activeModel.get('id');
       selectedRepoName = activeModel.get('name');
    }
    this.model.set({
      selectedOrgId: null,
      selectedOrgName: null,
      selectedRepoId: selectedRepoId,
      selectedRepoName: selectedRepoName
    });

    this.setSelectedGitHubProjectCommunityState();
    // Clicking a repo moves you onto the next step and fills in the data
    if(activeModel) {
      this.onStepNext();
    }
  },

  onRepoFilterInputChange: function() {
    var filterInput = this.ui.repoFilterInput[0].value;
    this.model.set('repoFilter', filterInput.length > 0 ? filterInput : null);
  },

  onRepoFilterChange: function() {
    // For people with thousands of repos, we want to hold off for perf
    // This is an arbitrary number
    if(this.repoCollection.length > 500) {
      this.throttledApplyFilterToRepos();
    }
    else {
      this.shortThrottledApplyFilterToRepos();
    }
  },

  applyFilterToRepos: function() {
    var filterString = (this.model.get('repoFilter') || '').toLowerCase();
    this.filteredRepoCollection.setFilter(function(model) {
      var shouldShow = true;
      if(filterString && filterString.length > 0) {
        shouldShow = fuzzysearch(filterString, model.get('name').toLowerCase());
      }

      return shouldShow;
    })
  },

  onRepoFilterComplete: function() {
    this.filteredRepoCollection.trigger('reset');
  }
});
