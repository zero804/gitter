'use strict';

var _ = require('underscore');
var Marionette = require('backbone.marionette');
var urlJoin = require('url-join');
var toggleClass = require('utils/toggle-class');
var slugify = require('slug');
var fuzzysearch = require('fuzzysearch');
var getRoomNameFromTroupeName = require('gitter-web-shared/get-room-name-from-troupe-name');

require('views/behaviors/isomorphic');

var template = require('./community-creation-github-projects-view.hbs');
var CommunityCreateBaseStepView = require('./community-creation-base-step-view');
var CommunityCreationOrgListView = require('./community-creation-org-list-view');
var CommunityCreationRepoListView = require('./community-creation-repo-list-view');


require('gitter-styleguide/css/components/headings.css');
require('gitter-styleguide/css/components/buttons.css');


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
      collection: this.orgsCollection
    }));
    this.listenTo(this.orgListView, 'org:activated', this.onOrgSelectionChange, this);
    this.listenTo(this.orgListView, 'org:cleared', this.onOrgSelectionChange, this);
    return this.orgListView;
  },

  initRepoListView: function(optionsForRegion) {
    this.repoListView = new CommunityCreationRepoListView(optionsForRegion({
      collection: this.reposCollection
    }));
    this.listenTo(this.repoListView, 'repo:activated', this.onRepoSelectionChange, this);
    this.listenTo(this.repoListView, 'repo:cleared', this.onRepoSelectionChange, this);
    return this.repoListView;
  },

  attributes: _.extend({}, CommunityCreateBaseStepView.prototype.attributes, {
    class: 'community-create-step-wrapper community-create-github-projects-step-wrapper'
  }),

  ui: _.extend({}, CommunityCreateBaseStepView.prototype.ui, {
    orgsToggle: '.community-create-github-projects-toggle-orgs',
    reposToggle: '.community-create-github-projects-toggle-repos',
    orgsArea: '.js-community-create-github-projects-orgs-area',
    reposArea: '.js-community-create-github-projects-repos-area',
    repoFilterInput: '.primary-community-repo-name-filter-input'
  }),

  events: _.extend({}, CommunityCreateBaseStepView.prototype.events, {
    'click @ui.nextStep': 'onStepNext',
    'click @ui.backStep': 'onStepBack',
    'click @ui.orgsToggle': 'onOrgsAreaToggle',
    'click @ui.reposToggle': 'onReposAreaToggle',
    'input @ui.repoFilterInput': 'onRepoFilterInputChange'
  }),

  modelEvents: _.extend({}, CommunityCreateBaseStepView.prototype.modelEvents, {
    'change:isOrgAreaActive change:isRepoAreaActive': 'onAreaActiveChange',
    'change:repoFilter': 'onRepoFilterChange'
  }),

  initialize: function(options) {
    CommunityCreateBaseStepView.prototype.initialize.apply(this, arguments);

    this.orgsCollection = options.orgsCollection;
    this.reposCollection = options.reposCollection;

    this.throttledApplyFilterToRepos = _.throttle(this.applyFilterToRepos, 500);
    this.shortThrottledApplyFilterToRepos = _.throttle(this.applyFilterToRepos, 100);
  },

  onRender: function() {
    this.onAreaActiveChange();
  },

  onStepNext: function() {
    if(this.model.get('isOrgAreaActive')) {
      var selectedOrgId = this.model.get('selectedOrgId');
      var selectedOrgName = this.model.get('selectedOrgName');
      this.communityCreateModel.set({
        communityName: selectedOrgName || '',
        communitySlug: slugify(selectedOrgName || ''),
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
        communitySlug: slugify(selectedRepoName),
        isUsingCustomSlug: false,
        githubOrgId: null,
        githubRepoId: selectedRepoId
      });
    }

    this.communityCreateModel.set('stepState', this.communityCreateModel.STEP_CONSTANT_MAP.main);
  },
  onStepBack: function() {
    this.communityCreateModel.set('stepState', this.communityCreateModel.STEP_CONSTANT_MAP.main);
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
    var areas = [
      'isOrgAreaActive',
      'isRepoAreaActive'
    ];
    var areaHash = areas.reduce(function(prevAreaHash, areaKey) {
      var value = false;
      if(areaKey === newActiveAreaKey) {
        value = true;
      }
      prevAreaHash[areaKey] = value;
      return prevAreaHash;
    }, {});
    this.model.set(areaHash);
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
      selectedOrgName: selectedOrgName
    });
  },
  onRepoSelectionChange: function(activeModel) {
    var selectedRepoId = null;
    var selectedRepoName = null;
    if(activeModel) {
       selectedRepoId = activeModel.get('id');
       selectedRepoName = activeModel.get('name');
    }
    this.model.set({
      selectedRepoId: selectedRepoId,
      selectedRepoName: selectedRepoName
    });
  },

  onRepoFilterInputChange: function() {
    var filterInput = this.ui.repoFilterInput[0].value;
    this.model.set('repoFilter', filterInput.length > 0 ? filterInput : null);
  },

  onRepoFilterChange: function() {
    // For people with thousands of repos, we want to hold off for perf
    // This is an arbitrary number
    if(this.reposCollection.length > 500) {
      this.throttledApplyFilterToRepos();
    }
    else {
      this.shortThrottledApplyFilterToRepos();
    }
  },

  applyFilterToRepos: function() {
    var filterString = (this.model.get('repoFilter') || '').toLowerCase();
    this.reposCollection.models.forEach(function(repoModel) {
      var shouldShow = true;
      if(filterString && filterString.length > 0) {
        shouldShow = fuzzysearch(filterString, repoModel.get('name').toLowerCase());
      }
      repoModel.set('hidden', !shouldShow);
    });
  }
});
