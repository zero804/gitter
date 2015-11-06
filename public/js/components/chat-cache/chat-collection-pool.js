'use strict';

var Backbone         = require('backbone');
var ChatCollection   = require('collections/chat').ChatCollection;
var chatCollection   = require('collections/instances/integrated-items').chats;
var context          = require('utils/context');

var pool        = {};
var poolSize    = 10;
var maxPoolSize = 20;
var lastRoom;
var userRooms;

module.exports = function chatCollectionPool(roomList) {

  userRooms = roomList;
  generatePool();

  //save the last selected room
  lastRoom = context.troupe().get('name');

  //listen to room changes
  context.troupe().on('change:id', onRoomChange);
};

function generatePool() {

  //sort by last access time
  var _roomList = userRooms.sort(function(roomA, roomB) {
    return roomA.lastAccess > roomB.lastAccess ? -1 : 1;
  });

  //only grab the top 10 rooms
  var rooms = _roomList.slice(0, poolSize);

  rooms.forEach(function(roomData) {
    var name = roomData.name;

    //if we don't already have a collection create one
    if(!pool[name]) pool[name] =  generateCollection(roomData.id);
  });

  //flush
  Object.keys(pool).forEach(function(key){

    //if we have keys that don't exist in the room list remove
    var shouldKeep = rooms.reduce(function(prev, current){
      return (prev || current.name === key);
    }, false);

    if(!shouldKeep) {
      pool[key] = null;
      delete pool[key];
    }

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

  //set the new contextModel which forces a sync
  contextModel.set('troupeId', roomId);

  return collection;
}

function onRoomChange(model) {
  var name = model.get('name');

  //if we don't have a cache entry just grab a new one
  var collection = (pool[name] || generateCollection());

  //save to old collection
  pool[lastRoom] = chatCollection.collection;

  //save the room name
  lastRoom = name;

  //switch collections
  chatCollection.switchCollection(collection);

  if(Object.keys(pool).length >= maxPoolSize){
    generatePool();
  }
}
