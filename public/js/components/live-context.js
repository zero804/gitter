"use strict";
var context = require('utils/context');
var troupeModels = require('collections/troupes');
var realtime = require('./realtime');
var log = require('utils/log');
var _ = require('underscore');

module.exports = {
  syncRoom: function() {
    realtime.getClient().subscribeTemplate({
      urlTemplate: '/v1/user/:userId/rooms',
      contextModel: context.contextModel(),
      onMessage: function(message) {
        var operation = message.operation;
        var newModel = message.model;
        var id = newModel.id;

        /* Only operate on the current context */
        if(id !== context.getTroupeId()) return;

        var parsed = new troupeModels.TroupeModel(newModel, { parse: true });

        switch(operation) {
          case 'create':
            var attributes = _.extend({}, parsed.attributes, { roomMember: true });
            // There can be existing documents for create events if the doc was created on this
            // client and lazy-inserted into the collection
            context.troupe().set(attributes);
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
            log.info("Unknown operation " + operation + ", ignoring");
        }
      },
      
      getSnapshotState: function() {
        /* We don't want snapshots. Just the live stream */
        return false;
      }
    });
  }
};
