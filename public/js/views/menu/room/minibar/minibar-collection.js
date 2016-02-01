'use strict';

var Backbone                     = require('backbone');
var getSuggestedOrgsFromRoomList = require('../../../../../../shared/orgs/suggested-orgs-from-room-list');

var defaultModels = [
  { name: 'all', type: 'all', id: 0 },
  { name: 'search', type: 'search', id: 1 },
  { name: 'favourite', type: 'favourite', id: 2 },
  { name: 'people', type: 'people', id: 3 },
];

var MinibarItemModel = Backbone.Model.extend({
  defaults: {
    name: ' ',
    type: 'org',
    url: ' ',
  }
});

module.exports = Backbone.Collection.extend({
  model: MinibarItemModel,

  constructor: function(models, attrs, options) {
    if (!attrs || !attrs.roomCollection) {
      throw new Error('A valid RoomCollection must be passed to a new instance of MinibarCollection');
    }

    this.roomCollection = attrs.roomCollection;
    this.listenTo(this.roomCollection, 'snapshot add sync', this.onCollectionUpdate, this);
    this.listenTo(this.roomCollection, 'remove', this.onItemRemoved, this);

    models = defaultModels.concat(models || []);
    Backbone.Collection.prototype.constructor.call(this, models, attrs, options);
  },

  onCollectionUpdate: function() {
    this.add(defaultModels.concat(getSuggestedOrgsFromRoomList(this.roomCollection.toJSON())), { merge: true });
  },

  onItemRemoved: function() {
    this.reset(defaultModels.concat(getSuggestedOrgsFromRoomList(this.roomCollection.toJSON())));
  },

});
