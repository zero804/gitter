"use strict";

var _ = require('lodash');
var RoomWithPolicyService = require('../../../services/room-with-policy-service');
var troupeService = require('../../../services/troupe-service');
var StatusError = require('statuserror');

module.exports = {
  id: 'roomMetaKey',

  show: function(req) {
    if (!req.user) { throw new StatusError(401); }
    if(req.params.roomMetaKey !== 'welcome-message') { throw new StatusError(401); }
    return troupeService.findById(req.params.troupeId)
      .then(function(troupe) {
        var roomWithPolicyService = new RoomWithPolicyService(troupe, req.user, req.userRoomPolicy);
        return roomWithPolicyService.getRoomWelcomeMessage();
      });
  },

  update: function(req){
    if (!req.user) { throw new StatusError(401); }
    if(req.params.roomMetaKey !== 'welcome-message') { throw new StatusError(401); }
    var data = _.clone(req.body);
    return troupeService.findById(req.params.troupeId)
      .then(function(troupe) {
        var roomWithPolicyService = new RoomWithPolicyService(troupe, req.user, req.userRoomPolicy);
        return roomWithPolicyService.updateRoomWelcomeMessage({ welcomeMessage: data.welcomeMessage });
      });
  },
};
