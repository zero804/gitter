'use strict';

var _ = require('underscore');
var toggleClass = require('utils/toggle-class');
var VirtualMultipleCollection = require('../virtual-multiple-collection');

var stepConstants = require('../step-constants');
var template = require('./community-creation-overview-view.hbs');
var CommunityCreateBaseStepView = require('../shared/community-creation-base-step-view');
var CommunityCreationSubRoomListView = require('../shared/community-creation-sub-room-list-view');
var CommunityCreationPeopleListView = require('../shared/community-creation-people-list-view');

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
      inviteListView: { el: '.community-create-overview-invite-list-root', init: 'initInviteListView' }
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
      collection: this.inviteCollection
    }));
    return this.inviteListView;
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

    this.inviteCollection = new VirtualMultipleCollection([], {
      backingCollections: [
        this.communityCreateModel.get('peopleToInvite'),
        this.communityCreateModel.get('emailsToInvite')
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
    // TODO: Actually create the community, sub-rooms, and invite the people
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
