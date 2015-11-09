'use strict';

var Backbone         = require('backbone');
var ChatCollection   = require('collections/chat').ChatCollection;
var chatCollection   = require('collections/instances/integrated-items').chats;
var context          = require('utils/context');

var pool        = {};
var poolSize    = 10;

module.exports = function chatCollectionPool(roomList) {

  //generate the pool of cached collections
  generatePool(roomList);

  //listen to room changes
  context.troupe().on('change:id', onRoomChange);
};

function generatePool(userRooms) {

  //sort by last access time
  var _roomList = userRooms.sort(function(roomA, roomB) {
    return roomA.lastAccess > roomB.lastAccess ? -1 : 1;
  });

  //only grab the top 10 rooms
  var rooms = _roomList.slice(0, poolSize);

  //we reverse here because lastAccess is generated along with the collection.
  //Because the most recent room will be first && we use a time stamp
  //we want that room to have the highest time stamp value possible
  //hence reversing the list, this makes no difference to the pool as it is a #
  rooms.reverse().forEach(function(roomData) {
    var name = roomData.name;

    //if we don't already have a collection create one
    if (!pool[name]) pool[name] =  generateCollection(roomData.id, roomData.name);
  });
}

function generateCollection(roomId) {

  roomId = (roomId || context.troupe().get('id'));

  //we make a new context model so we can request chats
  //from different rooms
  var contextModel = new Backbone.Model();

  //we extend ChatCollection to replace the contextModel with our new instance
  var BackgroundChatCollection = ChatCollection.extend({
    contextModel: contextModel,

    //override to stop re-subscription
    onRoomChange: function() {},
  });

  //Instantiate the new collection
  var collection = new BackgroundChatCollection(null, {
    listen: true,
  });

  collection.lastAccess = +new Date();

  //set the new contextModel which forces a sync
  contextModel.set('troupeId', roomId);

  return collection;
}

function getUncachedCollection(id, name) {

  var staleCollection = Object.keys(pool)
    .map(function(key) {
      return { key: key, collection: pool[key] };
    })
    .reduce(function(prev, current) {
      return prev.collection.lastAccess < current.collection.lastAccess ? prev : current;
    });

  //resubscribe to the new room
  staleCollection.collection.contextModel.set('troupeId', id);

  //store the new collection under it's new room
  pool[name] = staleCollection.collection;

  //remove old collection
  delete pool[staleCollection.key];

  return staleCollection.collection;
}

function onRoomChange(model) {
  var name = model.get('name');
  var id   = model.get('id');

  //if we don't have a cache entry just grab a new one
  var collection = (pool[name] || getUncachedCollection(id, name));
  collection.lastAccess = +new Date();

  //switch collections
  chatCollection.switchCollection(collection);
}
