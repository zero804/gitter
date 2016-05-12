'use strict';

var _ = require('underscore');
var Marionette = require('backbone.marionette');
var urlJoin = require('url-join');
var clientEnv = require('gitter-client-env');
var toggleClass = require('utils/toggle-class');
var resolveRoomAvatarSrcSet = require('gitter-web-shared/avatars/resolve-room-avatar-srcset');

var InviteUserResultListItemTemplate = require('./community-creation-invite-user-result-list-item-view.hbs');

var AVATAR_SIZE = 44;


var InviteUserResultListItemView = Marionette.ItemView.extend({
  template: InviteUserResultListItemTemplate,
  tagName: 'li',
  attributes: {
    class: 'community-create-invite-user-result-list-item'
  },

  triggers: {
    'click': 'item:activated'
  },

  modelEvents: {
    'change:active': 'onActiveChange'
  },

  initialize: function(options) {

  },

  serializeData: function() {
    var data = _.extend({}, this.model.toJSON());
    data.absoluteUri = urlJoin(clientEnv.basePath, this.model.get('username'));
    data.avatarSrcset = resolveRoomAvatarSrcSet({ uri: this.model.get('username') }, AVATAR_SIZE);
    return data;
  },

  onActiveChange: function() {
    toggleClass(this.$el[0], 'active', this.model.get('active'));
  }
});

module.exports = InviteUserResultListItemView;
