'use strict';

var Marionette = require('backbone.marionette');
var urlJoin = require('url-join');
var clientEnv = require('gitter-client-env');
var toggleClass = require('utils/toggle-class');

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
    this.communityCreateModel = options.communityCreateModel;

    if(this.communityCreateModel) {
      this.listenTo(this.communityCreateModel, 'change:allowTweetBadger', this.onAllowTweetBadgerChange, this);
    }
  },

  serializeData: function() {
    var data = this.model.toJSON();

    data.allowRemove = this.options.allowRemove;

    var githubUsername = data.githubUsername;
    var twitterUsername = data.twitterUsername;
    var username = githubUsername || twitterUsername || data.username;
    data.vendorUsername = username;

    data.absoluteUri = urlJoin(clientEnv.basePath, username);

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
    var allowTweetBadger = this.communityCreateModel.get('allowTweetBadger');
    var isTwitter = this.model.get('type') === 'twitter';

    // Only use Twitter badger, if email wasn't provided
    var willUseTwitterInvite = !this.model.get('emailAddress') && isTwitter && allowTweetBadger;

    this.ui.emailInput.val(this.model.get('emailAddress'));

    toggleClass(this.el, 'pending', !willUseTwitterInvite && inviteStatus === peopleToInviteStatusConstants.PENDING);
    // We don't use this state to differentiate
    //toggleClass(this.el, 'ready', inviteStatus === peopleToInviteStatusConstants.READY);
    toggleClass(this.el, 'needs-email', !willUseTwitterInvite && inviteStatus === peopleToInviteStatusConstants.NEEDS_EMAIL);
    toggleClass(this.el, 'ready-valid-email', inviteStatus === peopleToInviteStatusConstants.READY_VALID_EMAIL);
  },

  onLinkClick: function(e) {
    e.preventDefault();
    e.stopPropagation();
  },

  onAllowTweetBadgerChange: function() {
    this.onInviteStatusChange();
  }
});

var CommunityCreationPeopleListEmptyView = Marionette.ItemView.extend({
  template: CommunityCreationPeopleListEmptyTemplate,
});

var CommunityCreationPeopleListView = Marionette.CompositeView.extend({
  template: CommunityCreationPeopleListTemplate,
  childView: CommunityCreationPeopleListItemView,
  emptyView: CommunityCreationPeopleListEmptyView,
  childViewContainer: '.community-create-people-list',

  childViewOptions: function() {
    return {
      communityCreateModel: this.communityCreateModel,
      allowRemove: this.options.allowRemove,
    };
  },

  childEvents: {
    'item:remove': 'onItemRemoved'
  },

  initialize: function(options) {
    this.communityCreateModel = options.communityCreateModel;
  },

  onItemRemoved: function(view) {
    this.trigger('invite:remove', view.model);
  }
});

module.exports = CommunityCreationPeopleListView;
