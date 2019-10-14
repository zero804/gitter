'use strict';

var _ = require('lodash');
var RoomWithPolicyService = require('gitter-web-rooms/lib/room-with-policy-service');
var StatusError = require('statuserror');
var loadTroupeFromParam = require('./load-troupe-param');

module.exports = {
  id: 'roomMetaKey',

  show: async function(req) {
    if (!req.user) {
      throw new StatusError(401);
    }

    const troupe = await loadTroupeFromParam(req);
    const roomWithPolicyService = new RoomWithPolicyService(troupe, req.user, req.userRoomPolicy);
    return await roomWithPolicyService.getMeta();
  },

  update: async function(req) {
    if (!req.user) {
      throw new StatusError(401);
    }
    var data = _.clone(req.body);

    const troupe = await loadTroupeFromParam(req);
    const roomWithPolicyService = new RoomWithPolicyService(troupe, req.user, req.userRoomPolicy);

    return await roomWithPolicyService.updateRoomMeta({
      welcomeMessage: data.welcomeMessage,
      threadedConversations: data.threadedConversations
    });
  }
};
