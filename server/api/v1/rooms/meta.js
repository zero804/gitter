var _ = require('lodash');
var metaService = require('../../../services/room-meta-service');
var RoomWithPolicyService = require('../../../services/room-with-policy-service');
var troupeService = require('../../../services/troupe-service');

function allowAdmin() {
  return this.policy.canAdmin();
}

module.exports = {
  id: 'roomMetaKey',

  show: function(req) {
    if (!req.user) { throw new StatusError(401); }
    if(req.params.roomMetaKey !== 'welcome-message') { return {}; }
    return troupeService.findById(req.params.troupeId)
      .then(function(troupe) {
        var roomWithPolicyService = new RoomWithPolicyService(troupe, req.user, req.userRoomPolicy);
        return roomWithPolicyService.getRoomWelcomeMessage();
      });
  },

  update: function(){
    if (!req.user) { throw new StatusError(401); }
    if(req.params.roomMetaKey !== 'welcome-message') { return {}; }
    var data = _.clone(req.body);
    return troupeService.findById(req.params.troupeId)
      .then(function(troupe) {
        var roomWithPolicyService = new RoomWithPolicyService(troupe, req.user, req.userRoomPolicy);
        return roomWithPolicyService.updateRoomWelcomeMessage({ welcomeMessage: data.welcomeMessage });
      });
  },
};
