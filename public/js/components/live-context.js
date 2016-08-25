"use strict";
var context = require('../utils/context');
var troupeModels = require('./../collections/troupes');
var realtime = require('./realtime');
var debug = require('debug-proxy')('app:live-context');

module.exports = {
  syncRoom: function() {
    realtime.getClient().subscribeTemplate({
      urlTemplate: '/v1/user/:userId/rooms',
      contextModel: context.contextModel(),
      onMessage: function(message) {
        debug("Incoming: %j", message);

        var operation = message.operation;
        var newModel = message.model;
        var id = newModel.id;

        /* Only operate on the current context */
        if(id !== context.getTroupeId()) return;

        var parsed = new troupeModels.TroupeModel(newModel, { parse: true });

        switch(operation) {
          case 'create':
            // There can be existing documents for create events if the doc was created on this
            // client and lazy-inserted into the collection
            context.troupe().set(parsed.attributes);
            break;

          case 'patch':
          case 'update':
            // There can be existing documents for create events if the doc was created on this
            // client and lazy-inserted into the collection
            context.troupe().set(parsed.attributes);
            break;

          case 'remove':
            context.troupe().set({ roomMember: false });
            break;

          default:
            debug("Unknown operation %s ignoring", operation);
        }
      },

      getSnapshotState: function() {
        /* We don't want snapshots. Just the live stream */
        return false;
      }
    });
  }
};
