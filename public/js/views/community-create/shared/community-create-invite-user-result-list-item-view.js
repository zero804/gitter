'use strict';

var _ = require('underscore');
var Marionette = require('backbone.marionette');
var urlJoin = require('url-join');
var clientEnv = require('gitter-client-env');
var avatars = require('gitter-web-avatars');
var toggleClass = require('../../../utils/toggle-class');
var resolveRoomAvatarSrcSet = require('gitter-web-shared/avatars/resolve-room-avatar-srcset');

var InviteUserResultListItemTemplate = require('./community-creation-invite-user-result-list-item-view.hbs');

var AVATAR_SIZE = 44;

var InviteUserResultListItemView = Marionette.ItemView.extend({
  template: InviteUserResultListItemTemplate,
  tagName: 'li',
  className: 'community-create-invite-user-result-list-item',

  triggers: {
    'click': 'item:activated'
  },

  modelEvents: {
    'change:active': 'onActiveChange'
  },

  serializeData: function() {
    var data = _.extend({}, this.model.toJSON());

    var githubUsername = this.model.get('githubUsername');
    var twitterUsername = this.model.get('twitterUsername');
    var username = githubUsername || twitterUsername || this.model.get('username');
    data.vendorUsername = username;
    var emailAddress = data.emailAddress;

    data.absoluteUri = urlJoin(clientEnv.basePath, username);

    data.avatarSrcset = resolveRoomAvatarSrcSet({ uri: data.username }, AVATAR_SIZE);
    if(emailAddress) {
      data.avatarUrl = avatars.getForGravatarEmail(emailAddress);
    }

    return data;
  },

  onActiveChange: function() {
    toggleClass(this.$el[0], 'active', this.model.get('active'));
  }
});

module.exports = InviteUserResultListItemView;
