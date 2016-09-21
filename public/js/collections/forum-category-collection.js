'use strict';

var Backbone = require('backbone');
var urlJoin = require('url-join');
var apiClient = require('../components/api-client');

var ForumCategoryCollection = Backbone.Collection.extend({
  initialize: function(models, options) {
    if (!options || !options.roomMenuModel) {
      throw new Error('A valid ForumCategoryCollection must be passed to a new instance of RoomMenuModel');
    }

    this.roomMenuModel = options.roomMenuModel;
    this.groupsCollection = options.groupsCollection;
    this.listenTo(this.roomMenuModel, 'change:state change:groupId', this.onModelChangeState);
  },

  onModelChangeState: function() {
    var groupId = this.roomMenuModel.get('groupId');
    var menuState = this.roomMenuModel.get('state');

    var group = this.groupsCollection && this.groupsCollection.get(groupId);
    var forumId = group && group.get('forumId');

    this.reset();
    if(menuState === 'org' && forumId) {
      apiClient.get(urlJoin('/v1/forums/', forumId))
        .bind(this)
        .then(function(forum) {
          this.reset(forum.categories.map(function(category) {
            category.groupUri = group.get('uri');
            return category;
          }));
        });
    }
  },

});

module.exports = ForumCategoryCollection;
