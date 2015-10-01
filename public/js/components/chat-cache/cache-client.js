'use strict';

var promiseDB = require('promise-db');
var context   = require('utils/context');
var config    = context.getIndexedDBConfig();

var collections = [];

//Install listeners on a given collection
function install(collection) {
  collection.once('sync', onCollectionSync, collection);
  collection.on('add change', onModelAdded, collection);
  collections.push(collection);
}

//remove all listeners and flush the current collections
function flush() {
  collections.forEach(function(collection) {
    collection.off('add change', onModelAdded);
  });

  collections = [];
}

//after the inital sync we want to store all of the chats
//we have bound the context to that of the collection
function onCollectionSync() {
  var _this  = this;
  var models = this.toJSON();
  promiseDB
    .createDB(config)
    .then(function(db) {
      return promiseDB.put(db, 'chats', models.map(function(model) {
        //assign the correct room ID
        model.roomId   = _this.roomId;
        model.roomName = _this.roomName;
        return model;
      }));
    })
    .done();
}

//when a chat is added we want to store it in the DB
function onModelAdded(model) {
  model = model.toJSON();
  model.roomId   = this.roomId;

  promiseDB
    .createDB(config)
    .then(function(db) {
      return promiseDB.put(db, 'chats', model);
    })
    .done();
}

module.exports = {
  install: install,
  flush:   flush,
};
