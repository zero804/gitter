'use strict';

var _ = require('underscore');
var Promise = require('bluebird');
var toggleClass = require('utils/toggle-class');
var appEvents = require('utils/appevents');

var stepConstants = require('../step-constants');
var template = require('./community-creation-overview-view.hbs');
var CommunityCreateBaseStepView = require('../shared/community-creation-base-step-view');
var CommunityCreationPeopleListView = require('../shared/community-creation-people-list-view');
var apiClient = require('../../../components/apiClient');

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
      collection: this.inviteCollection,
      communityCreateModel: this.communityCreateModel,
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
    this.inviteCollection = options.inviteCollection;
    this.troubleInviteCollection = options.troubleInviteCollection;

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

    var groupData = this.getCreateData();

    return apiClient.post('/v1/groups', groupData)
      .then(function(results) {
        var defaultRoomName = results && results.defaultRoom && results.defaultRoom.name;
        var defaultRoomUri = results && results.defaultRoom && results.defaultRoom.uri;

        // Hide create community
        communityCreateModel.set('active', false);

        // Move to the default room
        appEvents.trigger('navigation', '/' + defaultRoomUri, 'chat', defaultRoomName);
        // Select the new community in the new left menu
        appEvents.trigger('left-menu-menu-bar:activate', {
          state: 'org',
          groupId: results.id
        });
      });

  },

  getSecurityData: function() {
    var communityCreateModel = this.communityCreateModel;

    var type = null;
    var linkPath = null;

    var githubOrgId = communityCreateModel.get('githubOrgId');
    // Org based?
    if (githubOrgId) {
      var selectedOrg = this.orgCollection.get(githubOrgId);
      return {
        type: 'GH_ORG',
        linkPath: selectedOrg.get('name')
      }
    }

    // Repo based?
    var githubRepoId = communityCreateModel.get('githubRepoId');
    if (githubRepoId) {
      var selectedRepo = this.repoCollection.get(githubRepoId);
      return {
        type: 'GH_REPO',
        linkPath: selectedRepo.get('uri')
      }
    }
  },

  getInviteData: function() {
    var communityCreateModel = this.communityCreateModel;

    return [].concat(communityCreateModel.peopleToInvite.toJSON(), communityCreateModel.emailsToInvite.toJSON());
  },

  getCreateData: function() {
    var communityCreateModel = this.communityCreateModel;

    var security = this.getSecurityData();
    var invites = this.getInviteData();

    return {
      name: communityCreateModel.get('communityName'),
      uri: communityCreateModel.get('communitySlug'),
      // type: 'org',
      // This one is for the left-menu
      // linkPath: linkPath,
      // This is for POSTing to the API
      security: security,
      invites: invites,
      addBadge: communityCreateModel.get('allowBadger'),
      // TODO: ADD UI option
      allowTweeting: true
    };
  },

  onStepBack: function() {
    // Only go back to confirmation if there was trouble initially
    if(this.troubleInviteCollection.length > 0) {
      this.communityCreateModel.set('stepState', stepConstants.INVITE_CONFIRMATION);
    }
    else {
      this.communityCreateModel.set('stepState', stepConstants.INVITE);
    }
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
