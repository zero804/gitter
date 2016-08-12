'use strict';

var Backbone = require('backbone');
var SimpleFilteredCollection = require('gitter-realtime-client/lib/simple-filtered-collection');
var SuggestedRoomsByRoomCollection = require('./room-suggested-rooms');
var SyncMixin = require('./sync-mixin');

var SuggestionsContextModel = Backbone.Model.extend({});

var Model = Backbone.Model.extend({
  defaults: {
    isSuggestion: true
  }
});

var SuggestedCollection = SuggestedRoomsByRoomCollection.extend({
  model: Model,

  initialize: function(models, options) {
    if (!options || !options.roomMenuModel) {
      throw new Error('A valid instance of a RoomMenuModel must be passed to a new instance of LeftMenuSuggestionsCollection');
    }

    this.roomMenuModel = options.roomMenuModel;
    this.listenTo(this.roomMenuModel, 'change:state', this.onDataUpdate, this);

    if (!options || !options.troupeModel) {
      throw new Error('A valid instance of a TroupeModel must be passed to a new instance of LeftMenuSuggestionsCollection');
    }

    this.troupeModel = options.troupeModel;
    this.listenTo(this.troupeModel, 'change:id', this.onDataUpdate, this);

    this.contextModel = new SuggestionsContextModel(null, {
      roomMenuModel: this.roomMenuModel,
      troupeModel:   this.troupeModel,
    });

    options.contextModel = (options.contextModel || this.contextModel);
    SuggestedRoomsByRoomCollection.prototype.initialize.call(this, models, options);

  },

  onDataUpdate: function () {
    //check the menu state
    var currentMenuState = this.roomMenuModel.get('state');
    if(currentMenuState !== 'all' &&
       currentMenuState !== 'favourite' &&
       currentMenuState !== 'org') { return }

    //check the current state of the room
    var currentRoomId = this.troupeModel.get('id');
    if(!currentRoomId) { return }

    //update url and get data
    this.contextModel.set('roomId', currentRoomId);

    //If we have not changed room dont fetch
    if(!this.contextModel.changed.roomId) { return }

    //If a user has previously dismissed suggestions never fetch()
    if(this.roomMenuModel.get('hasDismissedSuggestions')) { return; }
    this.fetch();
  },

  sync: SyncMixin.sync,
});

var FilteredSuggestionsCollection = SimpleFilteredCollection.extend({
  constructor: function(options) {
    var collection = new SuggestedCollection(null, options);
    var roomCollection = options.roomCollection;

    SimpleFilteredCollection.prototype.constructor.call(this, [], {
      collection: collection,
      filter: function(model) {
        return !roomCollection.get(model.get('id'));
      }
    });

    this.listenTo(roomCollection, 'update', function() {
      this.setFilter();
    });
  },

});

module.exports = FilteredSuggestionsCollection;
