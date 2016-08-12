'use strict';

var Backbone = require('backbone');
var _ = require('underscore');
var context = require('utils/context');
var SearchPeopleCollection = require('./search-people');
var SearchRoomCollection = require('./search-rooms');
var SearchRepoCollection = require('./search-repos');
var SimpleFilteredCollection = require('gitter-realtime-client/lib/simple-filtered-collection');
var LimitedCollection = require('gitter-realtime-client/lib/limited-collection');
var fuzzysearch = require('fuzzysearch');

function roomFilter(roomMenuModel, room) {
  return roomMenuModel.get('searchTerm') && fuzzysearch(roomMenuModel.get('searchTerm'), room.get('name'));
}

//take a list of object which have a property of id and return a uniq array
function uniqByUrl(list) {

  var map = {};

  //push items into the map such that they are uniq
  list.forEach(function(item) {
    //guard against no url property
    if(item.url){ map[item.url] = item; }
  });

  //return the objects not the map
  return Object.keys(map).map(function(key) {
    return map[key];
  });
}

var SearchMessageAndPeople = Backbone.Collection.extend({
  initialize: function(models, attrs) {//jshint unused: true

    if (!attrs || !attrs.roomMenuModel) {
      throw new Error('A valid instance of RoomMenuModel should be passed to a new LeftMenuSearchRoomsAndPeopleCollection');
    }

    if (!attrs || !attrs.roomCollection) {
      throw new Error('A valid instance of a roomCollection should be passed to a new LeftMenuSearchRoomsAndPeopleCollection');
    }

    this.roomMenuModel = attrs.roomMenuModel;
    this.roomCollection = attrs.roomCollection;

    this.searchPeopleCollection = new SearchPeopleCollection(null, { contextModel: this.roomMenuModel });
    this.searchRoomCollection = new SearchRoomCollection(null, { contextModel: this.roomMenuModel });
    this.searchRepoCollection = new SearchRepoCollection(null, { contextModel: context.user() });
    this.searchCurrentRooms = new SimpleFilteredCollection([], {
      collection: this.roomCollection,
      filter: _.partial(roomFilter, this.roomMenuModel)
    });

    this.listenTo(this.roomMenuModel, 'change:searchTerm', this.onSearchUpdate, this);
    this.listenTo(this.searchPeopleCollection, 'change add remove reset update', this.onCollectionChange, this);
    this.listenTo(this.searchRoomCollection, 'change add remove reset update', this.onCollectionChange, this);
    this.listenTo(this.searchRepoCollection, 'change add remove reset update', this.onCollectionChange, this);
  },

  onSearchUpdate: function () {
    if (!this.roomMenuModel.get('searchTerm')) {
      this.searchRoomCollection.reset();
      this.searchRepoCollection.reset();
      return this.searchPeopleCollection.reset();
    }

    var query = { data: { q: this.roomMenuModel.get('searchTerm'), limit: 3, type: 'gitter' } };
    this.searchRoomCollection.fetch(query);
    this.searchRepoCollection.fetch(query);
    this.searchPeopleCollection.fetch(query);
    this.searchCurrentRooms.setFilter();
  },

  onCollectionChange: function () {
    var currentRooms = (this.searchCurrentRooms.toJSON() || []);
    var repos = (this.searchRepoCollection.toJSON() || []);
    var rooms = (this.searchRoomCollection.toJSON() || []);
    var people = (this.searchPeopleCollection.toJSON() || []);

    //format our results
    var results = currentRooms.concat(repos).concat(rooms).concat(people);
    results = uniqByUrl(results).map(function(model){
      model.isHidden = false;
      return model;
    });

    this.reset(results);
  },

});

var FilteredSearchMessageAndPeople = LimitedCollection.extend({
  constructor: function(models, options) {
    LimitedCollection.prototype.constructor.call(this, [], {
      collection: new SearchMessageAndPeople(models, options),
      maxLength: 6
    });
  }
});

module.exports = FilteredSearchMessageAndPeople;
