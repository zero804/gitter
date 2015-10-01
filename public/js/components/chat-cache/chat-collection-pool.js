'use strict';
/*
 * For now this module will spawn a chat collection for
 * a designated number of rooms based on the troupeCollection
 * this could be much more efficient as each collection will
 * spawn a new faye connection
 * @supreememoocow I'm looking at you for help on this one
 * JP 14/9/15
 * */

var Backbone         = require('backbone');
var onready          = require('utils/onready');
var RAF              = require('utils/raf');
var troupeCollection = require('collections/instances/troupes');
var ChatCollection   = require('collections/chat').ChatCollection;
var CacheClient      = require('components/chat-cache/cache-client');

//maximum size of the chatCollection pool
var POOL_SIZE = 4;

var roomCollection = troupeCollection.troupes;
var pool = [];

//We don't want to cause a roadblock on start up
//therefore we want to wait for on ready
//and then request the next available frame
onready(function() {
  RAF(function() {
    //once the room collection has updated
    //via snapshot we are good to go!!

    //TODO -> we need to figure out when is best to re-construct
    //the pool.
    roomCollection.once('change', function() {
      pool = roomCollection.map(function(model, index) {
        //only create the right number of chatCollection instances
        return (index < POOL_SIZE) ? initListeners(model) : null;
      });
    });
  });
});

function initListeners(roomModel) {

  //we make a new context model so we can request chats
  //from different rooms
  var contextModel = new Backbone.Model();

  //we extend ChatCollection to replace the contextModel with our new instance
  var BackgroundChatCollection = ChatCollection.extend({
    contextModel: contextModel,
    roomId: roomModel.get('id'),

    //debug
    roomName: roomModel.get('url'),

    //override to stop re-subscription
    onRoomChange: function() {},
  });

  //Instantiate the new collection
  var collection = new BackgroundChatCollection(null, {
    listen: true,
  });

  //set the new contextModel which forces a sync
  contextModel.set('troupeId', roomModel.get('id'));

  CacheClient.install(collection);

  return collection;
}
