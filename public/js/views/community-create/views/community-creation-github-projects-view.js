'use strict';

var _ = require('underscore');
var Marionette = require('backbone.marionette');
var urlJoin = require('url-join');
var toggleClass = require('utils/toggle-class');
var slugify = require('slug');
var resolveRoomAvatarSrcSet = require('gitter-web-shared/avatars/resolve-room-avatar-srcset');

require('views/behaviors/isomorphic');

var CommunityCreateBaseStepView = require('./community-creation-base-step-view');
var template = require('./community-creation-github-projects-view.hbs');
var CommunityCreationOrgListTemplate = require('./community-creation-github-projects-org-list-view.hbs');
var CommunityCreationOrgListItemTemplate = require('./community-creation-github-projects-org-list-item-view.hbs');
var CommunityCreationRepoListTemplate = require('./community-creation-github-projects-repo-list-view.hbs');
var CommunityCreationRepoListItemTemplate = require('./community-creation-github-projects-repo-list-item-view.hbs');

var ActiveCollection = require('./active-collection');
var troupeCollections = require('collections/instances/troupes');
var orgsCollection = troupeCollections.orgs;
var repoModels = require('collections/repos');
var ReposCollection = repoModels.ReposCollection;

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
    this.communityCreateModel = options.communityCreateModel;
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
  childViewOptions: function(model, index) {
    var opts = {
      index: index,
      model: model,
      communityCreateModel: this.communityCreateModel
    };

    return opts;
  },
  childEvents: {
    'item:activated': 'onItemActivated'
  },

  initialize: function(options) {
    this.communityCreateModel = options.communityCreateModel;
  },

  onItemActivated: function(view) {
    var previousActiveModel = this.collection.findWhere({ active: true });
    if(previousActiveModel) {
      previousActiveModel.set('active', false);
    }
    // Set the new one active
    view.model.set('active', true);
    this.trigger('org:activated', view.model);
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

  initialize: function() {

  },

  serializeData: function() {
    var data = this.model.toJSON();
    data.absoluteUri = urlJoin('https://github.com', data.uri);
    data.avatarSrcset = resolveRoomAvatarSrcSet({ uri: data.uri }, REPO_LIST_AVATAR_SIZE);

    return data;
  }
});

var CommunityCreationRepoListView = Marionette.CompositeView.extend({
  template: CommunityCreationRepoListTemplate,
  childView: CommunityCreationRepoListItemView,
  childViewContainer: '.community-create-repo-list'
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
      collection: this.orgsCollection,
      communityCreateModel: this.communityCreateModel
    }));
    this.listenTo(this.orgListView, 'org:activated', this.onOrgSelectionChange, this);
    return this.orgListView;
  },

  initRepoListView: function(optionsForRegion) {
    this.repoListView = new CommunityCreationRepoListView(optionsForRegion({
      collection: this.reposCollection,
      communityCreateModel: this.communityCreateModel
    }));
    return this.repoListView;
  },

  attributes: _.extend({}, CommunityCreateBaseStepView.prototype.attributes, {
    class: 'community-create-step-wrapper community-create-github-projects-step-wrapper'
  }),

  ui: _.extend({}, CommunityCreateBaseStepView.prototype.ui, {
    orgsToggle: '.community-create-github-projects-toggle-orgs',
    reposToggle: '.community-create-github-projects-toggle-repos',
    orgsArea: '.community-create-github-projects-orgs-area',
    reposArea: '.community-create-github-projects-repos-area'
  }),

  events: _.extend({}, CommunityCreateBaseStepView.prototype.events, {
    'click @ui.nextStep': 'onStepNext',
    'click @ui.backStep': 'onStepBack',
    'click @ui.orgsToggle': 'onOrgsAreaToggle',
    'click @ui.reposToggle': 'onReposAreaToggle'
  }),

  modelEvents: _.extend({}, CommunityCreateBaseStepView.prototype.modelEvents, {
    'change:isOrgAreaActive change:isRepoAreaActive': 'onAreaActiveChange'
  }),

  initialize: function() {
    CommunityCreateBaseStepView.prototype.initialize.apply(this, arguments);

    this.orgsCollection = new ActiveCollection(orgsCollection.models, {
      collection: orgsCollection
    });

    this.reposCollection = new ReposCollection();
    this.reposCollection.fetch();

  },

  onRender: function() {
    this.onAreaActiveChange();
  },

  onStepNext: function() {
    var selectedOrgId = this.model.get('selectedOrgId');
    var selectedOrgName = this.model.get('selectedOrgName');
    this.communityCreateModel.set({
      communityName: selectedOrgName || '',
      communitySlug: slugify(selectedOrgName || ''),
      isUsingCustomSlug: false,
      githubOrgId: selectedOrgId
    });

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
    this.model.set({
    selectedOrgId: activeModel.get('id'),
      selectedOrgName: activeModel.get('name')
    });
  }
});
