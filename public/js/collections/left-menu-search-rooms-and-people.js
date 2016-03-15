'use strict';

var Backbone               = require('backbone');
var context                = require('utils/context');
var SearchPeopleCollection = require('./search-people');
var SearchRoomCollection   = require('./search-rooms');
var SearchRepoCollection   = require('./search-repos');

module.exports = Backbone.Collection.extend({
  initialize: function(models, attrs) {//jshint unused: true
    if (!attrs || !attrs.roomMenuModel) {
      throw new Error('A valid instance of RoomMenuModel should be passed to a new LeftMenuSearchRoomsAndPeopleCollection');
    }

    this.roomMenuModel          = attrs.roomMenuModel;
    this.searchPeopleCollection = new SearchPeopleCollection(null, { contextModel: this.roomMenuModel });
    this.searchRoomCollection   = new SearchRoomCollection(null, { contextModel: this.roomMenuModel });
    this.searchRepoCollection   = new SearchRepoCollection(null, { contextModel: context.user() });

    this.listenTo(this.roomMenuModel, 'change:searchTerm', this.onSearchUpdate, this);
    this.listenTo(this.searchPeopleCollection, 'change add remove reset update', this.onCollectionChange, this);
    this.listenTo(this.searchRoomCollection, 'change add remove reset update', this.onCollectionChange, this);
    this.listenTo(this.searchRepoCollection, 'change add remove reset update', this.onCollectionChange, this);
  },

  onSearchUpdate: function (){
    if(!this.roomMenuModel.get('searchTerm')) {
      this.searchRoomCollection.reset();
      this.searchRepoCollection.reset();
      return this.searchPeopleCollection.reset();
    }
    var query = { data: { q: this.roomMenuModel.get('searchTerm'), limit: 3, type: 'gitter' } };
    this.searchRoomCollection.fetch(query);
    this.searchRepoCollection.fetch(query);
    this.searchPeopleCollection.fetch(query);
  },

  onCollectionChange: function (){
    var rooms  = (this.searchRoomCollection.toJSON() || []);
    var people = (this.searchPeopleCollection.toJSON() || []);
    var repos  = (this.searchRepoCollection.toJSON() || []);
    this.reset(repos.concat(rooms).concat(people));
  },

});
