'use strict';

var _ = require('underscore');
var urlJoin = require('url-join');
var toggleClass = require('utils/toggle-class');

var template = require('./community-creation-overview-view.hbs');
var CommunityCreateBaseStepView = require('./community-creation-base-step-view');
var CommunityCreationSubRoomListView = require('./community-creation-sub-room-list-view');
var CommunityCreationPeopleListView = require('./community-creation-people-list-view');
var CommunityCreationEmailListView = require('./community-creation-email-list-view');

require('gitter-styleguide/css/components/headings.css');
require('gitter-styleguide/css/components/buttons.css');


module.exports = CommunityCreateBaseStepView.extend({
  template: template,

  attributes: _.extend({}, CommunityCreateBaseStepView.prototype.attributes, {
    class: 'community-create-step-wrapper community-create-overview-step-wrapper'
  }),

  behaviors: {
    Isomorphic: {
      //subRoomListView: { el: '.community-create-sub-room-list-root', init: 'initSubRoomListView' },
      inviteListView: { el: '.community-create-overview-invite-list-root', init: 'initInviteListView' },
      inviteEmailListView: { el: '.community-create-overview-invite-email-list-root', init: 'initInviteEmailListView' },
    },
  },

  initSubRoomListView: function(optionsForRegion) {
    this.subRoomListView = new CommunityCreationSubRoomListView(optionsForRegion({
      collection: this.communityCreateModel.get('subRooms'),
      communityCreateModel: this.communityCreateModel
    }));
    return this.subRoomListView;
  },

  initInviteListView: function(optionsForRegion) {
    this.inviteListView = new CommunityCreationPeopleListView(optionsForRegion({
      collection: this.communityCreateModel.get('peopleToInvite')
    }));
    return this.inviteListView;
  },

  initInviteEmailListView: function(optionsForRegion) {
    this.inviteEmailListView = new CommunityCreationEmailListView(optionsForRegion({
      collection: this.communityCreateModel.get('emailsToInvite')
    }));
    return this.inviteEmailListView;
  },


  ui: _.extend({}, CommunityCreateBaseStepView.prototype.ui, {
    communityNameHeading: '.community-create-overview-community-name',
    communityUrlSlug: '.community-create-overview-url-heading-slug',
    githubLink: '.community-create-overview-github-link',
    githubName: '.community-create-overview-github-name'
  }),

  events: _.extend({}, CommunityCreateBaseStepView.prototype.events, {
    'click @ui.nextStep': 'onStepNext',
    'click @ui.backStep': 'onStepBack',
  }),

  initialize: function(options) {
    CommunityCreateBaseStepView.prototype.initialize.apply(this, arguments);

    this.orgCollection = options.orgCollection;
    this.repoCollection = options.repoCollection;

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
    // TODO: Actually create the community, sub-rooms, and invite the people
  },
  onStepBack: function() {
    this.communityCreateModel.set('stepState', this.communityCreateModel.STEP_CONSTANT_MAP.invite);
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
