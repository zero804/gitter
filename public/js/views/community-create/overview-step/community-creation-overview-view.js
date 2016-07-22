'use strict';

var _ = require('underscore');
var Promise = require('bluebird');
var toggleClass = require('utils/toggle-class');
var appEvents = require('utils/appevents');
var VirtualMultipleCollection = require('../virtual-multiple-collection');

var stepConstants = require('../step-constants');
var template = require('./community-creation-overview-view.hbs');
var CommunityCreateBaseStepView = require('../shared/community-creation-base-step-view');
var CommunityCreationPeopleListView = require('../shared/community-creation-people-list-view');

require('gitter-styleguide/css/components/headings.css');
require('gitter-styleguide/css/components/buttons.css');


var _super = CommunityCreateBaseStepView.prototype;

module.exports = CommunityCreateBaseStepView.extend({
  template: template,

  className: 'community-create-step-wrapper community-create-overview-step-wrapper',

  behaviors: {
    Isomorphic: {
      inviteListView: { el: '.community-create-overview-invite-list-root', init: 'initInviteListView' }
    },
  },

  initInviteListView: function(optionsForRegion) {
    this.inviteListView = new CommunityCreationPeopleListView(optionsForRegion({
      collection: this.inviteCollection
    }));
    return this.inviteListView;
  },

  ui: _.extend({}, _super.ui, {
    communityNameHeading: '.community-create-overview-community-name',
    communityUrlSlug: '.community-create-overview-url-heading-slug',
    githubLink: '.community-create-overview-github-link',
    githubName: '.community-create-overview-github-name'
  }),

  events: _.extend({}, _super.events, {
    'click @ui.nextStep': 'onStepNext',
    'click @ui.backStep': 'onStepBack',
  }),

  initialize: function(options) {
    _super.initialize.apply(this, arguments);

    this.orgCollection = options.orgCollection;
    this.repoCollection = options.repoCollection;
    this.groupsCollection = options.groupsCollection;

    this.inviteCollection = new VirtualMultipleCollection([], {
      backingCollections: [
        this.communityCreateModel.peopleToInvite,
        this.communityCreateModel.emailsToInvite
      ]
    });

    this.listenTo(this.communityCreateModel, 'change:communityName change:communitySlug change:githubOrgId', this.onCommunityDataChange, this);
  },

  serializeData: function() {
    var data = _.extend({}, this.model.toJSON());
    data.communityName = this.communityCreateModel.get('communityName');
    data.communitySlug = this.communityCreateModel.get('communitySlug');

    var githubProjectInfo = this.communityCreateModel.getGithubProjectInfo(this.orgCollection, this.repoCollection);
    data.githubName = githubProjectInfo.name;
    data.githubLink = githubProjectInfo.url;

    return data;
  },

  onStepNext: function() {
    var communityCreateModel = this.communityCreateModel;

    var type = null;
    var linkPath = null;
    var githubOrgId = communityCreateModel.get('githubOrgId');
    var githubRepoId = communityCreateModel.get('githubRepoId');
    var githubProjectModel = this.orgCollection.get(githubOrgId) || this.repoCollection.get(githubRepoId);
    if(githubOrgId && githubProjectModel) {
      type = 'GH_ORG';
      linkPath = githubProjectModel.get('name').toLowerCase();
    }
    else if(githubRepoId && githubProjectModel) {
      type = 'GH_REPO';
      linkPath = githubProjectModel.get('uri');
    }

    var creatingGroupPromise = new Promise(function(resolve, reject) {
      this.groupsCollection.create({
        name: communityCreateModel.get('communityName'),
        uri: communityCreateModel.get('communitySlug'),
        type: 'org',
        // This one is for the left-menu
        linkPath: linkPath,
        // This is for POSTing to the API
        security: {
          type: type,
          linkPath: linkPath
        },
        invites: [].concat(communityCreateModel.peopleToInvite.toJSON(), communityCreateModel.emailsToInvite.toJSON())
      }, {
        wait: true,
        success: function(model, response) {
          resolve(response);
        },
        error: function(model, response) {
          reject(response);
        }
      });
    }.bind(this));

    creatingGroupPromise.then(function(results) {
      var defaultRoomName = results && results.defaultRoom && results.defaultRoom.name;
      var defaultRoomUri = results && results.defaultRoom && results.defaultRoom.uri;

      // Move to the default room
      appEvents.trigger('navigation', '/' + defaultRoomUri, 'chat', defaultRoomName);
      // Select the new community in the new left menu
      appEvents.trigger('left-menu-menu-bar:activate', {
        state: 'org',
        groupName: results.name
      });
      // Hide create community
      //communityCreateModel.set('active', false);
      communityCreateModel.clear().set(communityCreateModel.defaults);
    });

  },
  onStepBack: function() {
    this.communityCreateModel.set('stepState', stepConstants.INVITE);
  },

  onCommunityDataChange: function() {
    var data = this.serializeData();

    this.ui.communityNameHeading[0].textContent = data.communityName;
    this.ui.communityUrlSlug[0].textContent = data.communitySlug;


    this.ui.githubLink[0].setAttribute('href', data.githubLink);
    this.ui.githubName[0].textContent = data.githubName;
    toggleClass(this.ui.githubLink[0], 'hidden', !data.githubLink);
  }
});
