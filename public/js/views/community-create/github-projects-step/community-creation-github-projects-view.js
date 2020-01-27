'use strict';

var _ = require('lodash');
var toggleClass = require('../../../utils/toggle-class');
var context = require('gitter-web-client-context');
var slugger = require('../../../utils/slugger');

var fuzzysearch = require('fuzzysearch');
var SimpleFilteredCollection = require('gitter-realtime-client/lib/simple-filtered-collection');
var getRoomNameFromTroupeName = require('gitter-web-shared/get-room-name-from-troupe-name');
var scopeUpgrader = require('../../../components/scope-upgrader');

var stepConstants = require('../step-constants');
var template = require('./community-creation-github-projects-view.hbs');
var CommunityCreateBaseStepView = require('../shared/community-creation-base-step-view');
var CommunityCreationOrgListView = require('./community-creation-org-list-view');
var CommunityCreationRepoListView = require('./community-creation-repo-list-view');

require('../../behaviors/isomorphic');

require('@gitterhq/styleguide/css/components/headings.css');
require('@gitterhq/styleguide/css/components/buttons.css');

var _super = CommunityCreateBaseStepView.prototype;

module.exports = CommunityCreateBaseStepView.extend({
  template: template,
  nextStep: stepConstants.MAIN,
  prevStep: stepConstants.MAIN,
  behaviors: {
    Isomorphic: {
      orgListView: { el: '.community-create-org-list-root', init: 'initOrgListView' },
      repoListView: { el: '.community-create-repo-list-root', init: 'initRepoListView' }
    }
  },

  initOrgListView: function(optionsForRegion) {
    this.orgListView = new CommunityCreationOrgListView(
      optionsForRegion({
        collection: this.communityCreateModel.orgs
      })
    );
    this.listenTo(this.orgListView, 'org:activated', this.onSelectionChange, this);
    this.listenTo(this.orgListView, 'org:cleared', this.onSelectionChange, this);
    return this.orgListView;
  },

  initRepoListView: function(optionsForRegion) {
    this.repoListView = new CommunityCreationRepoListView(
      optionsForRegion({
        collection: this.filteredRepos
      })
    );
    this.listenTo(this.repoListView, 'repo:activated', this.onSelectionChange, this);
    this.listenTo(this.repoListView, 'repo:cleared', this.onSelectionChange, this);
    return this.repoListView;
  },

  className: 'community-create-step-wrapper community-create-github-projects-step-wrapper',

  ui: _.extend({}, _super.ui, {
    orgsToggle: '.js-community-create-github-projects-toggle-orgs',
    reposToggle: '.js-community-create-github-projects-toggle-repos',
    orgsArea: '.js-community-create-github-projects-orgs-area',
    reposArea: '.js-community-create-github-projects-repos-area',
    repoFilterInput: '.primary-community-repo-name-filter-input',
    repoScopeMissingNote: '.community-create-repo-missing-note',
    upgradeGitHub: '.js-upgrade-github'
  }),

  events: _.extend({}, _super.events, {
    'click @ui.orgsToggle': 'onOrgsAreaToggle',
    'click @ui.reposToggle': 'onReposAreaToggle',
    'input @ui.repoFilterInput': 'onRepoFilterInputChange',
    'click @ui.upgradeGitHub': 'onUpgradeGitHub'
  }),

  modelEvents: _.extend({}, _super.modelEvents, {
    'change:isOrgAreaActive change:isRepoAreaActive': 'onAreaActiveChange',
    'change:repoFilter': 'onRepoFilterChange'
  }),

  initialize: function() {
    _super.initialize.apply(this, arguments);

    this.filteredRepos = new SimpleFilteredCollection([], {
      collection: this.communityCreateModel.repos
    });

    this.debouncedApplyFilterToRepos = _.debounce(this.applyFilterToRepos.bind(this), 200);
  },

  serializeData: function() {
    var data = this.model.toJSON();
    var user = context.getUser();
    data.isUserMissingPrivateRepoScope = user && user.scopes && !user.scopes.private_repo;

    return data;
  },

  onRender: function() {
    this.onAreaActiveChange();
  },

  setSelectedGitHubProjectCommunityState: function() {
    const selectedModel = this.model.get('selectedModel');
    const selectedType = selectedModel.get('type');
    const selectedName = selectedModel.get('name') || '';
    this.communityCreateModel.set({
      communityName: selectedName,
      communitySlug: slugger(selectedName),
      isUsingCustomSlug: false,
      isUsingExplicitGitHubProject: selectedType === 'GH_ORG' || selectedType === 'GH_REPO'
    });
  },

  onOrgsAreaToggle: function() {
    this.setAreaActive('isOrgAreaActive');
  },

  onReposAreaToggle: function() {
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

  onSelectionChange: function(activeModel) {
    // Set any previous org/repo item that may be selected inactive
    this.model.get('selectedModel').set('active', false);

    this.model.set({
      selectedModel: activeModel
    });

    this.setSelectedGitHubProjectCommunityState();
    // Clicking a org moves you onto the next step and fills in the data
    if (activeModel) {
      this.onStepNext();
    }
  },

  onRepoFilterInputChange: function() {
    var filterInput = this.ui.repoFilterInput[0].value;
    this.model.set('repoFilter', filterInput.length > 0 ? filterInput : null);
  },

  onRepoFilterChange: function() {
    this.debouncedApplyFilterToRepos();
  },

  applyFilterToRepos: function() {
    var filterString = (this.model.get('repoFilter') || '').toLowerCase();

    this.filteredRepos.setFilter(function(model) {
      var shouldShow = true;
      if (filterString && filterString.length > 0) {
        shouldShow = fuzzysearch(filterString, model.get('name').toLowerCase());
      }

      return shouldShow;
    });
  },

  onUpgradeGitHub: function(e) {
    e.preventDefault();

    var self = this;
    scopeUpgrader('repo')
      .then(function() {
        self.ui.repoScopeMissingNote.hide();
        return self.communityCreateModel.refreshGitHubCollections({ repos: true });
      })
      .then(function() {
        self.applyFilterToRepos();
      });

    return false;
  }
});
