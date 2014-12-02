"use strict";
var context = require('utils/context');
var troupeModels = require('collections/troupes');
var realtime = require('./realtime');
var log = require('utils/log');
var apiClient = require('components/apiClient');

module.exports = (function() {


  function attachRoom(room) {
    var url = apiClient.user.channel('/rooms');
    realtime.subscribe(url, function(data) {
      var operation = data.operation;
      var newModel = data.model;
      var id = newModel.id;

      /* Only operate on the current context */
      if(id !== room.id) return;

      var parsed = new troupeModels.TroupeModel(newModel, { parse: true });

      switch(operation) {
        case 'create':
        case 'patch':
        case 'update':
          // There can be existing documents for create events if the doc was created on this
          // client and lazy-inserted into the collection
          room.set(parsed.attributes);
          break;

        case 'remove':
          // TODO: send out an event that we've been removed from the collection
          break;

        default:
          log.info("Unknown operation " + operation + ", ignoring");

      }

    }, null, { snapshot: false });
  }

  return {
    syncRoom: function() {
      var room = context.troupe();

      if(room.id) {
        attachRoom(room);
      } else {
        room.once('change:id', function() {
          attachRoom(room);
        });
      }

    }
  };

})();

