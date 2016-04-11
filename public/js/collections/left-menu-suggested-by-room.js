'use strict';

var Backbone                       = require('backbone');
var _                              = require('underscore');
var FilteredCollection             = require('backbone-filtered-collection');
var SuggestedRoomsByRoomCollection = require('./room-suggested-rooms.js');
var SyncMixin                      = require('./sync-mixin');

var SuggestionsContextModel = Backbone.Model.extend({});

var SuggestedCollection = SuggestedRoomsByRoomCollection.extend({

  initialize: function(models, attrs, options) {

    if (!attrs || !attrs.roomMenuModel) {
      throw new Error('A valid instance of a RoomMenuModel must be passed to a new instance of LeftMenuSuggestionsCollection');
    }

    this.roomMenuModel = attrs.roomMenuModel;
    this.listenTo(this.roomMenuModel, 'change:state', this.onDataUpdate, this);

    if (!attrs || !attrs.troupeModel) {
      throw new Error('A valid instance of a TroupeModel must be passed to a new instance of LeftMenuSuggestionsCollection');
    }

    this.troupeModel = attrs.troupeModel;
    this.listenTo(this.troupeModel, 'change:id', this.onDataUpdate, this);

    this.contextModel = new SuggestionsContextModel(null, {
      roomMenuModel: this.roomMenuModel,
      troupeModel:   this.troupeModel,
    });

    attrs.contextModel = (attrs.contextModel || this.contextModel);
    SuggestedRoomsByRoomCollection.prototype.initialize.call(this, models, attrs, options);

  },

  onDataUpdate: function () {
    //check the menu state
    var currentMenuState = this.roomMenuModel.get('state');
    if(currentMenuState !== 'all' &&
       currentMenuState !== 'favourite'  &&
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

var FilteredSuggestedCollection = function(attrs, options){
    this.collection             = new SuggestedCollection(null, attrs);
    this.roomCollection         = attrs.roomCollection;
    this.suggestedOrgCollection = attrs.suggestedOrgsCollection;
    this.collectionFilter       = this.collectionFilter.bind(this);
    attrs                       = _.extend({}, attrs, { collection: this.collection });

    this.listenTo(this.roomCollection, 'update', this.onCollectionSync, this);
    FilteredCollection.call(this, attrs, options);
};

_.extend(FilteredSuggestedCollection.prototype, FilteredCollection.prototype, {

  collectionFilter: function (model){
    return !this.roomCollection.get(model.get('id'));
  },

  onCollectionSync: function (){
    this.setFilter();
  },

});

module.exports = FilteredSuggestedCollection;
