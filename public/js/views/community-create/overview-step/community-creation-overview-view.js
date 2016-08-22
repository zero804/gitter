'use strict';

var _ = require('underscore');
var toggleClass = require('utils/toggle-class');
var appEvents = require('utils/appevents');
var stepConstants = require('../step-constants');
var template = require('./community-creation-overview-view.hbs');
var CommunityCreateBaseStepView = require('../shared/community-creation-base-step-view');
var InviteListView = require('../shared/community-creation-people-list-view');
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
    this.inviteListView = new InviteListView(optionsForRegion({
      collection: this.communityCreateModel.invites,
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

  initialize: function() {
    _super.initialize.apply(this, arguments);
    this.listenTo(this.communityCreateModel, 'change:communityName change:communitySlug change:githubOrgId', this.onCommunityDataChange, this);
  },

  serializeData: function() {
    var data = _.extend({}, this.model.toJSON());
    data.communityName = this.communityCreateModel.get('communityName');
    data.communitySlug = this.communityCreateModel.get('communitySlug');

    var githubProjectInfo = this.communityCreateModel.getGithubProjectInfo();
    data.githubName = githubProjectInfo.name || '';
    data.githubLink = githubProjectInfo.url || '';

    return data;
  },

  /**
   * @override
   */
  onStepNext: function() {
    var communityCreateModel = this.communityCreateModel;
    var groupData = this.communityCreateModel.getSerializedCreateData();

    return apiClient.post('/v1/groups', groupData)
      .then(function(results) {
        var defaultRoomName = results && results.defaultRoom && results.defaultRoom.name;
        var defaultRoomUri = results && results.defaultRoom && results.defaultRoom.uri;

        // Move to the default room
        appEvents.trigger('navigation', '/' + defaultRoomUri, 'chat', defaultRoomName);

        // Select the new community in the new left menu
        appEvents.trigger('left-menu-menu-bar:activate', {
          state: 'org',
          groupId: results.id
        });

        // Hide create community
        communityCreateModel.set('active', false);
      });

  },

  prevStep: function() {
    if (this.communityCreateModel.hasInvitesRequiringEmailEntry()) {
      // Only go back to confirmation if there was trouble initially
      return stepConstants.INVITE_CONFIRMATION;
    } else {
      return stepConstants.INVITE;
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
