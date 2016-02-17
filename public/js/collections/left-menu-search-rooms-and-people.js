'use strict';

var Backbone               = require('backbone');
var SearchPeopleCollection = require('./search-people');
var SearchRoomCollection   = require('./search-rooms');

module.exports = Backbone.Collection.extend({
  initialize: function(models, attrs) {//jshint unused: true
    if (!attrs || !attrs.roomMenuModel) {
      throw new Error('A valid instance of RoomMenuModel should be passed to a new LeftMenuSearchRoomsAndPeopleCollection');
    }

    this.roomMenuModel = attrs.roomMenuModel;
    this.searchPeopleCollection = new SearchPeopleCollection(null, { contextModel: this.roomMenuModel });
    this.searchRoomCollection = new SearchRoomCollection(null, { contextModel: this.roomMenuModel });

    this.listenTo(this.roomMenuModel, 'change:searchTerm', this.onSearchUpdate, this);
    this.listenTo(this.searchPeopleCollection, 'change add remove reset update', this.onCollectionChange, this);
    this.listenTo(this.searchRoomCollection, 'change add remove reset update', this.onCollectionChange, this);
  },

  onSearchUpdate: function (){
    if(!this.roomMenuModel.get('searchTerm')) {
      this.searchRoomCollection.reset();
      return this.searchPeopleCollection.reset();
    }
    var query = { data: { q: this.roomMenuModel.get('searchTerm'), limit: 3, type: 'gitter' } };
    this.searchRoomCollection.fetch(query);
    this.searchPeopleCollection.fetch(query);
  },

  onCollectionChange: function (){
    var rooms = (this.searchRoomCollection.toJSON() || []);
    var people = (this.searchPeopleCollection.toJSON() || []);
    this.reset(rooms.concat(people));
  },

});
