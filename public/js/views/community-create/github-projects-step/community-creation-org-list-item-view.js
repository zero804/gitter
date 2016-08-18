'use strict';

var Marionette = require('backbone.marionette');
var urlJoin = require('url-join');
var toggleClass = require('../../../utils/toggle-class');
var resolveRoomAvatarSrcSet = require('gitter-web-shared/avatars/resolve-room-avatar-srcset');

var CommunityCreationOrgListItemTemplate = require('./community-creation-org-list-item-view.hbs');

var ORG_LIST_AVATAR_SIZE = 44;


var CommunityCreationOrgListItemView = Marionette.ItemView.extend({
  template: CommunityCreationOrgListItemTemplate,
  tagName: 'li',
  className: 'community-create-org-list-item',

  triggers: {
    'click': 'item:activated'
  },

  modelEvents: {
    'change:active': 'onActiveChange'
  },

  initialize: function(options) {

  },

  serializeData: function() {
    var data = this.model.toJSON();
    data.absoluteUri = urlJoin('https://github.com', data.name);
    data.avatarSrcset = resolveRoomAvatarSrcSet({ uri: data.name }, ORG_LIST_AVATAR_SIZE);

    return data;
  },

  onActiveChange: function() {
    toggleClass(this.$el[0], 'active', this.model.get('active'));
  }
});

module.exports = CommunityCreationOrgListItemView;
