'use strict';

var Marionette = require('backbone.marionette');
var urlJoin = require('url-join');
var toggleClass = require('utils/toggle-class');
var resolveRoomAvatarSrcSet = require('gitter-web-shared/avatars/resolve-room-avatar-srcset');

var CommunityCreationRepoListItemTemplate = require('./community-creation-repo-list-item-view.hbs');

var REPO_LIST_AVATAR_SIZE = 22;

var CommunityCreationRepoListItemView = Marionette.ItemView.extend({
  template: CommunityCreationRepoListItemTemplate,
  tagName: 'li',
  attributes: {
    class: 'community-create-repo-list-item'
  },

  triggers: {
    'click': 'item:activated'
  },

  modelEvents: {
    'change:hidden': 'onHiddenChange',
    'change:active': 'onActiveChange'
  },

  initialize: function() {

  },

  serializeData: function() {
    var data = this.model.toJSON();
    data.absoluteUri = urlJoin('https://github.com', data.uri);
    data.avatarSrcset = resolveRoomAvatarSrcSet({ uri: data.uri }, REPO_LIST_AVATAR_SIZE);

    return data;
  },

  onHiddenChange: function() {
    toggleClass(this.$el[0], 'hidden', this.model.get('hidden'));
  },
  onActiveChange: function() {
    toggleClass(this.$el[0], 'active', this.model.get('active'));
  },
});

module.exports = CommunityCreationRepoListItemView;
