'use strict';

var promiseDB      = require('promise-db');
var context        = require('utils/context');
var chatCollection = require('collections/instances/integrated-items').chats;

context.troupe().on('change:id', onRoomChange);

function onRoomChange() {
  promiseDB
    .createDB(context.getIndexedDBConfig())
    .then(function(db) {
      return promiseDB.getCollection(db, 'chats', 'roomId', context.troupe().get('id'));
    })
    .then(function(collection) {
      console.log(collection);
      chatCollection.handleSnapshot(collection);
    })
    .done();

}
