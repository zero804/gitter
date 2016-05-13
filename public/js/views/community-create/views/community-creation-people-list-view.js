'use strict';

var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var urlJoin = require('url-join');
var clientEnv = require('gitter-client-env');
var toggleClass = require('utils/toggle-class');

var resolveRoomAvatarSrcSet = require('gitter-web-shared/avatars/resolve-room-avatar-srcset');

var CommunityCreationPeopleListTemplate = require('./community-creation-people-list-view.hbs');
var CommunityCreationPeopleListItemTemplate = require('./community-creation-people-list-item-view.hbs');
var CommunityCreationPeopleListEmptyTemplate = require('./community-creation-people-list-empty-view.hbs');

var AVATAR_SIZE = 44;

var CommunityCreationPeopleListItemView = Marionette.ItemView.extend({
  template: CommunityCreationPeopleListItemTemplate,
  tagName: 'li',
  attributes: {
    class: 'community-create-people-list-item'
  },

  ui: {
    link: '.community-create-people-list-item-link',
    removeButton: '.community-create-people-list-item-remove-button'
  },

  events: {
    'click @ui.link': 'onLinkClick'
  },

  triggers: {
    'click @ui.removeButton': 'item:remove'
  },

  initialize: function(options) {
    this.model.set('canRemove', options.canRemove);
  },

  serializeData: function() {
    var data = this.model.toJSON();
    data.absoluteUri = urlJoin(clientEnv.basePath, this.model.get('username'));
    data.avatarSrcset = resolveRoomAvatarSrcSet({ uri: data.username }, AVATAR_SIZE);

    return data;
  },

  onActiveChange: function() {
    toggleClass(this.$el[0], 'active', this.model.get('active'));
  },

  onLinkClick: function(e) {
    e.preventDefault();
    e.stopPropagation();
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
      canRemove: this.model.get('canRemove')
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
