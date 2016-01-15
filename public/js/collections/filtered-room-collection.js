'use strict';

var Backbone = require('backbone');
var BackboneFilteredCollection = require('filtered-collection');

module.exports = Backbone.FilteredCollection.extend({
  initialize: function(collection, options) {//jshint unused: true
    if (!options || !options.roomModel) {
      throw new Error('A valid RoomMenuModel must be passed to a new instance of FilteredRoomCollection');
    }

    this.roomModel = options.roomModel;
    this.listenTo(this.roomModel, 'change:state', this.onModelChangeState, this);

    if (!options || !options.collection) {
      throw new Error('A valid RoomCollection must be passed to a new instance of FilteredRoomCollection');
    }
    this.roomCollection = options.collection;
    this.listenTo(this.roomCollection, 'snapshot', this.onRoomCollectionSnapshot, this);

    BackboneFilteredCollection.prototype.initialize.apply(this, arguments);
  },

  onModelChangeState: function (model, val){//jshint unused: true
    switch(val) {
      case 'favourite' :
        this.setFilter(this.filterFavourite);
        break;
      case 'people' :
        this.setFilter(this.filterOneToOnes);
        break;
      case 'search' :
        this.setFilter(this.filterSearches);
        break;
      default:
        this.setFilter(false);
        break;
    }
  },

  filterFavourite: function (model){
    return !!model.get('favourite');
  },

  filterOneToOnes: function (model){
    return model.get('githubType') === 'ONETOONE';
  },

  filterSearches: function(){
    return false;
  },

  onRoomCollectionSnapshot: function (){
    var args = Array.prototype.slice.call(arguments);
    this.trigger.apply(this, ['snapshot'].concat(args));
  },

});
