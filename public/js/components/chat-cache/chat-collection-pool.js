'use strict';

var Backbone         = require('backbone');
var ChatCollection   = require('collections/chat').ChatCollection;
var chatCollection   = require('collections/instances/integrated-items').chats;
var context          = require('utils/context');

var pool     = {};
var poolSize = 10;
var lastRoom;

module.exports = function chatCollectionPool(roomList) {
  //sort by last access time
  roomList = roomList.sort(function(roomA, roomB) {
    return roomA.lastAccess > roomB.lastAccess ? -1 : 1;
  });

  //only grab the top 10 rooms
  roomList.slice(0, poolSize).forEach(function(roomData) {
    var name = roomData.name;
    pool[name] =  generateCollection(roomData.id);
  });

  //save the last selected room
  lastRoom = context.troupe().get('name');


  //listen to room changes
  context.troupe().on('change:id', onRoomChange);
};

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
}
