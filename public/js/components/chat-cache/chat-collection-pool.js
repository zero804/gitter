'use strict';
var Backbone         = require('backbone');
var ChatCollection   = require('collections/chat').ChatCollection;
var chatCollection   = require('collections/instances/integrated-items').chats;
var context          = require('utils/context');

var pool = {};
var lastRoom;

module.exports = function chatCollectionPool(roomList) {
  roomList.forEach(function(roomData) {
    var name = roomData.name;
    pool[name] =  initListeners(roomData.id);
  });

  window.pool = pool;

  lastRoom = context.troupe().get('name');
  context.troupe().on('change:id', onRoomChange);
};

function initListeners(roomId) {

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
  var collection = pool[name];
  pool[lastRoom] = chatCollection.collection;
  lastRoom = name;
  chatCollection.switchCollection(collection);
}
