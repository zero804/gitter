'use strict';

//TODO This has basically turned into a controller, refactor it JP 2/2/16

const Backbone = require('backbone');

module.exports = Backbone.Model.extend({
  defaults: {
    groupId: ''
  },

  // eslint-disable-next-line max-statements
  initialize: function(attrs) {
    if (!attrs || !attrs.bus) {
      throw new Error('A valid message bus must be passed when creating a new RoomMenuModel');
    }

    if (!attrs || !attrs.roomCollection) {
      throw new Error('A valid room collection must be passed to a new RoomMenuModel');
    }

    if (!attrs || !attrs.userModel) {
      throw new Error('A valid user model must be passed to a new RoomMenuModel');
    }

    //assign internal collections
    this._roomCollection = attrs.roomCollection;
    delete attrs.roomCollection;

    this._troupeModel = attrs.troupeModel;
    delete attrs.troupeModel;

    this._orgCollection = attrs.orgCollection;

    this._detailCollection = attrs.detailCollection || new Backbone.Collection();
    delete attrs.detailCollection;

    this.userModel = attrs.userModel;
    delete attrs.userModel;

    this.groupsCollection = attrs.groupsCollection;
    delete attrs.groupsCollection;

    //TODO have added setState so this can be removed
    //tests must be migrated
    this.bus = attrs.bus;
    delete attrs.bus;
  },

  toJSON: function() {
    return {
      roomMenuIsPinned: this.get('roomMenuIsPinned'),
      hasDismissedSuggestions: this.get('hasDismissedSuggestions')
    };
  },

  getCurrentGroup: function() {
    if (this.get('state') !== 'org') {
      return false;
    }
    return this.groupsCollection.get(this.get('groupId'));
  }
});
