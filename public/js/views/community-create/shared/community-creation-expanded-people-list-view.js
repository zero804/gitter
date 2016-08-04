'use strict';

var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var urlJoin = require('url-join');
var clientEnv = require('gitter-client-env');
var avatars = require('gitter-web-avatars');
var toggleClass = require('utils/toggle-class');
var resolveRoomAvatarSrcSet = require('gitter-web-shared/avatars/resolve-room-avatar-srcset');

var peopleToInviteStatusConstants = require('../people-to-invite-status-constants');
var CommunityCreationPeopleListTemplate = require('./community-creation-expanded-people-list-view.hbs');
var CommunityCreationPeopleListItemTemplate = require('./community-creation-expanded-people-list-item-view.hbs');
var CommunityCreationPeopleListEmptyTemplate = require('./community-creation-expanded-people-list-empty-view.hbs');

// Consider all constraints except a customError because we use
// this to add a custom message on what to do to satisfy
var isFormElementInvalid = function(el, useCustomError) {
  return el.validity.badInput ||
    (useCustomError ? el.validity.customError : false) ||
    el.validity.patternMismatch ||
    el.validity.rangeOverflow ||
    el.validity.rangeUnderflow ||
    el.validity.stepMismatch ||
    el.validity.tooLong ||
    el.validity.typeMismatch ||
    //el.validity.valid ||
    el.validity.valueMissing;
};


var AVATAR_SIZE = 44;

var CommunityCreationPeopleListItemView = Marionette.ItemView.extend({
  template: CommunityCreationPeopleListItemTemplate,
  tagName: 'li',
  className: 'community-create-expanded-people-list-item',

  ui: {
    link: '.community-create-expanded-people-list-item-link',
    emailInput: '.js-community-create-expanded-people-list-item-email-input',
    twitterStatusIcon: '.js-community-create-expanded-people-list-item-status-twitter',
    needsAttentionStatusIcon: '.js-community-create-expanded-people-list-item-status-needs-attention'
  },

  events: {
    'click @ui.link': 'onLinkClick',
    'input @ui.emailInput': 'onEmailInputChange'
  },

  modelEvents: {
    'change:inviteStatus': 'onInviteStatusChange'
  },

  triggers: {

  },

  initialize: function(options) {
    this.communityCreateModel = options.communityCreateModel;

    if(this.communityCreateModel) {
      this.listenTo(this.communityCreateModel, 'change:allowTweetBadger', this.onAllowTweetBadgerChange, this);
    }
  },

  serializeData: function() {
    var data = this.model.toJSON();

    var githubUsername = data.githubUsername;
    var twitterUsername = data.twitterUsername;
    var username = githubUsername || twitterUsername || data.username;
    data.vendorUsername = username;
    var emailAddress = data.emailAddress;

    data.absoluteUri = urlJoin(clientEnv.basePath, username);

    data.avatarSrcset = resolveRoomAvatarSrcSet({ uri: data.username }, AVATAR_SIZE);
    if(emailAddress) {
      data.avatarUrl = avatars.getForGravatarEmail(emailAddress);
    }

    data.isTwitter = data.type === 'twitter';
    data.shouldShowOnHover = data.isTwitter;

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
    var isEmailValid = !isFormElementInvalid(this.ui.emailInput[0]);
    if(isEmailValid) {
      this.model.set('inviteStatus', peopleToInviteStatusConstants.READY_VALID_EMAIL);
    }
    else {
      this.model.set('inviteStatus', peopleToInviteStatusConstants.NEEDS_EMAIL);
    }

    this.model.set('emailAddress', emailInputText);
  },

  onAllowTweetBadgerChange: function() {
    var allowTweetBadger = this.communityCreateModel.get('allowTweetBadger');
    var isTwitter = this.model.get('type') === 'twitter';

    var canShowTwitterStatus = isTwitter && allowTweetBadger;
    toggleClass(this.ui.emailInput[0], 'should-show-on-hover', canShowTwitterStatus);
    toggleClass(this.ui.twitterStatusIcon[0], 'hidden', !canShowTwitterStatus);
    toggleClass(this.ui.needsAttentionStatusIcon[0], 'hidden', canShowTwitterStatus);
  }
});

var CommunityCreationPeopleListEmptyView = Marionette.ItemView.extend({
  template: CommunityCreationPeopleListEmptyTemplate,
});

var CommunityCreationPeopleListView = Marionette.CompositeView.extend({
  model: new Backbone.Model(),

  className: 'community-create-expanded-people-list-root-inner',
  template: CommunityCreationPeopleListTemplate,
  childView: CommunityCreationPeopleListItemView,
  emptyView: CommunityCreationPeopleListEmptyView,
  childViewContainer: '.community-create-expanded-people-list',
  childViewOptions: function() {
    return {
      communityCreateModel: this.communityCreateModel
    };
  },

  initialize: function(options) {
    this.communityCreateModel = options.communityCreateModel;
  }
});

module.exports = CommunityCreationPeopleListView;
