'use strict';

var _ = require('underscore');
var Marionette = require('backbone.marionette');
var urlJoin = require('url-join');
var toggleClass = require('utils/toggle-class');
var resolveRoomAvatarSrcSet = require('gitter-web-shared/avatars/resolve-room-avatar-srcset');

require('views/behaviors/isomorphic');

var CommunityCreateBaseStepView = require('./community-creation-base-step-view');
var template = require('./community-creation-github-projects-view.hbs');
var CommunityCreationRepoListTemplate = require('./community-creation-github-projects-repo-list-view.hbs');
var CommunityCreationRepoListItemTemplate = require('./community-creation-github-projects-repo-list-item-view.hbs');

var repoModels = require('collections/repos');
var ReposCollection = repoModels.ReposCollection;

require('gitter-styleguide/css/components/headings.css');
require('gitter-styleguide/css/components/buttons.css');


var AVATAR_SIZE = 22;


var CommunityCreationRepoListItemView = Marionette.CompositeView.extend({
  tagName: 'li',
  template: CommunityCreationRepoListItemTemplate,

  initialize: function() {
    //console.log('m', this.model);
  },

  serializeData: function() {
    var data = this.model.toJSON();
    data.absoluteUri = urlJoin('https://github.com', data.uri);
    data.avatarSrcset = resolveRoomAvatarSrcSet({ uri: data.uri }, AVATAR_SIZE);

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
      repoListView: { el: '.community-create-repo-list-root', init: 'initRepoListView' },
    },
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
    'click @ui.orgsToggle': 'onOrgsAreaToggle',
    'click @ui.reposToggle': 'onReposAreaToggle'
  }),

  modelEvents: _.extend({}, CommunityCreateBaseStepView.prototype.modelEvents, {
    'change:isOrgAreaActive change:isRepoAreaActive': 'onAreaActiveChange'
  }),

  initialize: function(options) {
    CommunityCreateBaseStepView.prototype.initialize.apply(this, arguments);

    this.reposCollection = new ReposCollection();
    this.reposCollection.fetch();
  },

  onRender: function() {
    this.onAreaActiveChange();
  },

  onOrgsAreaToggle: function() {
    this.model.set({
      isOrgAreaActive: !this.model.get('isOrgAreaActive'),
      isRepoAreaActive: false,
    });
  },
  onReposAreaToggle: function() {
    this.model.set({
      isOrgAreaActive: false,
      isRepoAreaActive: !this.model.get('isRepoAreaActive')
    });
  },

  onAreaActiveChange: function() {
    var isOrgAreaActive = this.model.get('isOrgAreaActive');
    var isRepoAreaActive = this.model.get('isRepoAreaActive');

    toggleClass(this.ui.orgsToggle[0], 'active', isOrgAreaActive);
    toggleClass(this.ui.reposToggle[0], 'active', isRepoAreaActive);

    toggleClass(this.ui.orgsArea[0], 'active', isOrgAreaActive);
    toggleClass(this.ui.reposArea[0], 'active', isRepoAreaActive);
  }
});
