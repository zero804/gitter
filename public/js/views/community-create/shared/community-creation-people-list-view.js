'use strict';

var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var urlJoin = require('url-join');
var clientEnv = require('gitter-client-env');
var avatars = require('gitter-web-avatars');
var toggleClass = require('utils/toggle-class');

var resolveRoomAvatarSrcSet = require('gitter-web-shared/avatars/resolve-room-avatar-srcset');

var peopleToInviteStatusConstants = require('../people-to-invite-status-constants');
var CommunityCreationPeopleListTemplate = require('./community-creation-people-list-view.hbs');
var CommunityCreationPeopleListItemTemplate = require('./community-creation-people-list-item-view.hbs');
var CommunityCreationPeopleListEmptyTemplate = require('./community-creation-people-list-empty-view.hbs');

var CommunityCreationPeopleListItemView = Marionette.ItemView.extend({
  template: CommunityCreationPeopleListItemTemplate,
  tagName: 'li',
  className: 'community-create-people-list-item',

  ui: {
    link: '.community-create-people-list-item-link',
    removeButton: '.community-create-people-list-item-remove-button',
    emailInput: '.js-community-create-people-list-item-email-input'
  },

  events: {
    'click @ui.link': 'onLinkClick',
    'input @ui.emailInput': 'onEmailInputChange'
  },

  modelEvents: {
    'change:inviteStatus': 'onInviteStatusChange'
  },

  triggers: {
    'click @ui.removeButton': 'item:remove'
  },

  initialize: function(options) {
    this.model.set('canRemove', options.canRemove);
    this.model.set('canEditEmail', options.canEditEmail);
  },

  serializeData: function() {
    var data = this.model.toJSON();

    var githubUsername = this.model.get('githubUsername');
    var twitterUsername = this.model.get('twitterUsername');
    var username = githubUsername || twitterUsername;
    var emailAddress = data.emailAddress;

    data.absoluteUri = urlJoin(clientEnv.basePath, username);
    
    // TODO: Handle Twitter avatars
    if(githubUsername) {
      data.avatarUrl = avatars.getForGitHubUsername(githubUsername);
    }
    else if(username) {
      data.avatarUrl = avatars.getForUser(username);
    }
    else if(emailAddress) {
      data.avatarUrl = avatars.getForGravatarEmail(emailAddress);
    }

    return data;
  },

  onRender: function() {
    this.onInviteStatusChange();
  },

  onActiveChange: function() {
    toggleClass(this.$el[0], 'active', this.model.get('active'));
  },

  onInviteStatusChange: function() {
    var inviteStatus = this.model.get('inviteStatus');

    toggleClass(this.$el[0], 'pending', inviteStatus === peopleToInviteStatusConstants.PENDING);
    // We don't use this state to differentiate
    //toggleClass(this.$el[0], 'ready', inviteStatus === peopleToInviteStatusConstants.READY);
    toggleClass(this.$el[0], 'needs-email', inviteStatus === peopleToInviteStatusConstants.NEEDS_EMAIL);
    toggleClass(this.$el[0], 'ready-valid-email', inviteStatus === peopleToInviteStatusConstants.READY_VALID_EMAIL);
  },

  onLinkClick: function(e) {
    e.preventDefault();
    e.stopPropagation();
  },

  onEmailInputChange: function() {
    var emailInputText = this.ui.emailInput[0].value;
    if(emailInputText.length > 3) {
      this.model.set('inviteStatus', peopleToInviteStatusConstants.READY_VALID_EMAIL);
    }
    else {
      this.model.set('inviteStatus', peopleToInviteStatusConstants.NEEDS_EMAIL);
    }

    this.model.set('emailAddress', emailInputText);
  }
});

var CommunityCreationPeopleListEmptyView = Marionette.ItemView.extend({
  template: CommunityCreationPeopleListEmptyTemplate,
});

var CommunityCreationPeopleListView = Marionette.CompositeView.extend({
  model: new Backbone.Model(),

  template: CommunityCreationPeopleListTemplate,
  childView: CommunityCreationPeopleListItemView,
  emptyView: CommunityCreationPeopleListEmptyView,
  childViewContainer: '.community-create-people-list',
  childViewOptions: function() {
    return {
      canRemove: this.model.get('canRemove'),
      canEditEmail: this.model.get('canEditEmail')
    };
  },
  childEvents: {
    'item:remove': 'onItemRemoved'
  },

  onItemRemoved: function(view) {
    this.trigger('person:remove', view.model);
  }
});

module.exports = CommunityCreationPeopleListView;
