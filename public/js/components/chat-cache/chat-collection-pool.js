'use strict';

var Q              = require('q');
var Backbone       = require('backbone');
var ChatCollection = require('collections/chat').ChatCollection;
var chatCollection = require('collections/instances/integrated-items').chats;
var context        = require('utils/context');
var appEvents      = require('utils/appevents');

var pool            = {};
var poolSize        = 5;
var initialRoomId   = context.troupe().get('id');

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

  var roomQueue;

  //we reverse here because lastAccess is generated along with the collection.
  //Because the most recent room will be first && we use a time stamp
  //we want that room to have the highest time stamp value possible
  //hence reversing the list, this makes no difference to the pool as it is a #
  rooms.reverse().forEach(function(roomData) {

    //we want to lad collections synchronously (after they receive a snapshot)
    //so we need to queue the async actions
    //therefore if we don't already have a promise chain we make one then attach the
    //other generations to that.
    if (!roomQueue) roomQueue = generateCollection(roomData.id, roomData.name);
    else {
      roomQueue = roomQueue.then(function(result) {

        //send the result to be added to the pool
        resolveOnCollectionCreated(result);

        //make a new collection
        return generateCollection(roomData.id, roomData.name);
      });
    }
  });

  //we should have already set the roomQueue up
  //if it does not exist at this point then something went wrong
  //maybe we got an empty array from the main app
  //either way bail .....
  //TODO throw stats event because this shouldn't happen JP 10/11/15
  if (!roomQueue) return;

  //the finial promise needs to be resolved
  roomQueue.then(function(result) {
    resolveOnCollectionCreated(result);
    appEvents.trigger('chat-cache:ok');
  });

  //finish the promise so errors get thrown correctly
  roomQueue.done();
}

function resolveOnCollectionCreated(result) {
  pool[result.roomName] = stampCollection(result.collection);
}

function generateCollection(roomId, roomName) {
  return Q.Promise(function(resolve) {

    //the first collection will not receive a snapshot because its active
    //therefore we need to just store it in the pool
    if (roomId === initialRoomId) {

      //stop the original chat collection (behind the proxy) from
      //responding to any room change events
      var collection = chatCollection.collection;

      //stop the collections contextmodel listening for changes on the current troupeModel
      collection.contextModel.stopListening(context.troupe());
      return resolve({ roomName: roomName, collection: collection });
    }

    //get a default id (just to be safe)
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

    //only resolve once we have received a snapshot
    collection.once('snapshot', function() {
      resolve({
        roomName:   roomName,
        collection: collection,
      });
    });

    //set the new contextModel which forces a sync
    contextModel.set('troupeId', roomId);

  });
}

function getUncachedCollection(id, name) {

  //figure out which is the oldest collection in the pool
  var roomNames = Object.keys(pool);
  if (!roomNames.length) return fallback(id);

  var staleCollection = roomNames.map(function(key) {
      return { key: key, collection: pool[key] };
    })
    .reduce(function(prev, current) {
      return prev.collection.lastAccess < current.collection.lastAccess ? prev : current;
    });

  var collection = staleCollection.collection;

  //resubscribe to the new room with the oldest collection (recycle it)
  collection.contextModel.set('troupeId', id);

  //store the new collection under it's new room
  pool[name] = collection;

  //remove old reference to the collection from the pool
  delete pool[staleCollection.key];

  return collection;
}

function onRoomChange(model) {
  var name = model.get('name');
  var id   = model.get('id');

  //if we don't have a cache entry just grab a new one
  var collection = (pool[name] || getUncachedCollection(id, name));

  //if something went wrong just fall-back
  if (!collection) return fallback(id);

  //set a last access time
  collection = stampCollection(collection);

  //switch collections
  chatCollection.switchCollection(collection);
}

function stampCollection(collection) {

  if (!collection) return;

  collection.lastAccess = +new Date();
  return collection;
}

function fallback(id) {

  //if we somehow fall-back with no id the application with just trip out
  //so as we are good people, lets throw an error
  if (!id) throw new Error('chat-collection-cache tried to manually fallback but no troupeId was provided ... bad times');

  chatCollection.collection.contextModel.set('troupeId', id);
}
