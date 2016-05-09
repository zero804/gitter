'use strict';

var _ = require('underscore');
var Marionette = require('backbone.marionette');
var urlJoin = require('url-join');
var toggleClass = require('utils/toggle-class');
var slugify = require('slug');
var fuzzysearch = require('fuzzysearch');
var resolveRoomAvatarSrcSet = require('gitter-web-shared/avatars/resolve-room-avatar-srcset');
var getRoomNameFromTroupeName = require('gitter-web-shared/get-room-name-from-troupe-name');

require('views/behaviors/isomorphic');

var CommunityCreateBaseStepView = require('./community-creation-base-step-view');
var template = require('./community-creation-github-projects-view.hbs');
var CommunityCreationOrgListTemplate = require('./community-creation-github-projects-org-list-view.hbs');
var CommunityCreationOrgListItemTemplate = require('./community-creation-github-projects-org-list-item-view.hbs');
var CommunityCreationRepoListTemplate = require('./community-creation-github-projects-repo-list-view.hbs');
var CommunityCreationRepoListItemTemplate = require('./community-creation-github-projects-repo-list-item-view.hbs');




require('gitter-styleguide/css/components/headings.css');
require('gitter-styleguide/css/components/buttons.css');


var ORG_LIST_AVATAR_SIZE = 44;
var REPO_LIST_AVATAR_SIZE = 22;


// Orgs list
// -----------------------
var CommunityCreationOrgListItemView = Marionette.ItemView.extend({
  template: CommunityCreationOrgListItemTemplate,
  tagName: 'li',
  attributes: {
    class: 'community-create-org-list-item'
  },

  triggers: {
    'click': 'item:activated'
  },

  modelEvents: {
    'change:active': 'onActiveChange'
  },

  initialize: function(options) {

  },

  serializeData: function() {
    var data = this.model.toJSON();
    data.absoluteUri = urlJoin('https://github.com', data.name);
    data.avatarSrcset = resolveRoomAvatarSrcSet({ uri: data.name }, ORG_LIST_AVATAR_SIZE);

    return data;
  },

  onActiveChange: function() {
    toggleClass(this.$el[0], 'active', this.model.get('active'));
  }
});

var CommunityCreationOrgListView = Marionette.CompositeView.extend({
  template: CommunityCreationOrgListTemplate,
  childView: CommunityCreationOrgListItemView,
  childViewContainer: '.community-create-org-list',
  childEvents: {
    'item:activated': 'onItemActivated'
  },

  onItemActivated: function(view) {
    var newActiveValue = !view.model.get('active');

    var previousActiveModel = this.collection.findWhere({ active: true });
    if(previousActiveModel) {
      previousActiveModel.set('active', false);
    }
    // Toggle active
    view.model.set('active', newActiveValue);
    if(newActiveValue) {
      this.trigger('org:activated', view.model);
    }
    else {
      this.trigger('org:cleared');
    }
  }
});

// Repos list
// -----------------------
var CommunityCreationRepoListItemView = Marionette.ItemView.extend({
  template: CommunityCreationRepoListItemTemplate,
  tagName: 'li',
  attributes: {
    class: 'community-create-repo-list-item'
  },

  triggers: {
    'click': 'item:activated'
  },

  modelEvents: {
    'change:hidden': 'onHiddenChange',
    'change:active': 'onActiveChange'
  },

  initialize: function() {

  },

  serializeData: function() {
    var data = this.model.toJSON();
    data.absoluteUri = urlJoin('https://github.com', data.uri);
    data.avatarSrcset = resolveRoomAvatarSrcSet({ uri: data.uri }, REPO_LIST_AVATAR_SIZE);

    return data;
  },

  onHiddenChange: function() {
    toggleClass(this.$el[0], 'hidden', this.model.get('hidden'));
  },
  onActiveChange: function() {
    toggleClass(this.$el[0], 'active', this.model.get('active'));
  },
});

var CommunityCreationRepoListView = Marionette.CompositeView.extend({
  template: CommunityCreationRepoListTemplate,
  childView: CommunityCreationRepoListItemView,
  childViewContainer: '.community-create-repo-list',
  childEvents: {
    'item:activated': 'onItemActivated'
  },

  onItemActivated: function(view) {
    var newActiveValue = !view.model.get('active');

    var previousActiveModel = this.collection.findWhere({ active: true });
    if(previousActiveModel) {
      previousActiveModel.set('active', false);
    }
    // Toggle active
    view.model.set('active', newActiveValue);
    if(newActiveValue) {
      this.trigger('repo:activated', view.model);
    }
    else {
      this.trigger('repo:cleared');
    }
  }
});





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
    orgsArea: '.community-create-github-projects-orgs-area',
    reposArea: '.community-create-github-projects-repos-area',
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
