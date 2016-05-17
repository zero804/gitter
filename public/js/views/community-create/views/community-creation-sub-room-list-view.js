'use strict';

var Marionette = require('backbone.marionette');
var urlJoin = require('url-join');
var clientEnv = require('gitter-client-env');
var toggleClass = require('utils/toggle-class');

var CommunityCreationSubRoomListTemplate = require('./community-creation-sub-room-list-view.hbs');
var CommunityCreationSubRoomListItemTemplate = require('./community-creation-sub-room-list-item-view.hbs');


var CommunityCreationSubRoomListItemView = Marionette.ItemView.extend({
  template: CommunityCreationSubRoomListItemTemplate,
  tagName: 'li',
  attributes: {
    class: 'community-create-sub-room-list-item'
  },

  initialize: function(options) {
    this.communityCreateModel = options.communityCreateModel;

    this.listenTo(this.communityCreateModel, 'change:communitySlug', this.render, this);
  },

  serializeData: function() {
    var data = this.model.toJSON();
    if(this.communityCreateModel) {
      data.absoluteUri = urlJoin(clientEnv.basePath, this.communityCreateModel.get('communitySlug'), this.model.get('name'));
    }

    return data;
  },

  onActiveChange: function() {
    toggleClass(this.$el[0], 'active', this.model.get('active'));
  }
});


var CommunityCreationSubRoomListView = Marionette.CompositeView.extend({
  template: CommunityCreationSubRoomListTemplate,
  childView: CommunityCreationSubRoomListItemView,
  childViewContainer: '.community-create-sub-room-list',
  childViewOptions: function() {
    return {
      communityCreateModel: this.communityCreateModel
    };
  },
  childEvents: {
    'item:activated': 'onItemActivated'
  },
  initialize: function(options) {
    this.communityCreateModel = options.communityCreateModel;
  }
});

module.exports = CommunityCreationSubRoomListView;
