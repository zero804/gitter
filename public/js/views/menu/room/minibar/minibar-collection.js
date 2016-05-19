'use strict';

var Backbone = require('backbone');
var context  = require('utils/context');
//just use shared/
var getSuggestedOrgsFromRoomList = require('gitter-web-shared/orgs/suggested-orgs-from-room-list');

var defaultModels = [
  { name: 'all', type: 'all', id: 0 },
  { name: 'search', type: 'search', id: 1 },
  //{ name: 'favourite', type: 'favourite', id: 2 },
  { name: 'people', type: 'people', id: 3 },
];

var tailDefaults = [{ name: 'close', type: 'close', id: 5 }];

if(context.hasFeature('community-create')) {
  tailDefaults.unshift({ name: 'Create Community', type: 'community-create', id: 4 });
}

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
    this.listenTo(this.roomCollection, 'snapshot', this.onCollectionSnapshot, this);
    //TODO 'add remove events'
    this.listenTo(this.roomCollection, 'sync change:activity change:unreadItems change:mentions', this.onCollectionUpdate, this);
    this.listenTo(this.roomCollection, 'remove reset', this.onItemRemoved, this);

    models = defaultModels.concat(models || []).concat(tailDefaults);
    Backbone.Collection.prototype.constructor.call(this, models, attrs, options);
  },

  onCollectionUpdate: function() {
    var newCollection = this.getNewCollection();
    this.set(newCollection, { merge: true });
  },

  onItemRemoved: function() {
    this.reset(this.getNewCollection());
  },

  onCollectionSnapshot: function (){
    this.trigger('snapshot');
  },

  getNewCollection: function (){
    var currentRoom = this.roomCollection.get(context.troupe().get('id')) || context.troupe();
    return defaultModels
      .concat(getSuggestedOrgsFromRoomList(
        this.roomCollection.toJSON(),
        document.location.pathname,
        context.troupe().get('id'),
        currentRoom
      ))
      .concat(tailDefaults);
  },

});
