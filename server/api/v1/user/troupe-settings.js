"use strict";

var StatusError           = require('statuserror');
var roomMembershipService = require('../../../services/room-membership-service');

function generateResponse(userId, troupeId) {
  return roomMembershipService.getMembershipDetails(userId, troupeId)
    .then(function(details) {
      if (!details) throw new StatusError(404);

      return {
        push: details.mode, // REMOVE THIS
        mode: details.mode,
        lurk: details.lurk, // ALSO deprecated

        unread: details.unread,
        activity: details.activity,
        mention: details.mention,
        announcement: details.announcement,
        desktop: details.desktop,
        mobile: details.mobile
      };
    });

}
/**
 * TODO: REMOVE THIS WHOLE RESOURCE AND UPDATE THIS VIA THE USER TROUPE
 * with { mode: x }
*/
module.exports = {
  id: 'setting',

  show: function(req) {
    var userId = req.resourceUser.id;
    var troupeId = req.params.userTroupeId;
    var setting = req.params.setting;

    if (setting !== 'notifications') throw new StatusError(404);

    return generateResponse(userId, troupeId);
  },

  update: function(req) {
    var userId = req.resourceUser.id;
    var troupeId = req.params.userTroupeId;
    var setting = req.params.setting;

    if (setting !== 'notifications') throw new StatusError(404);

    var settings = req.body;
    var mode = settings && (settings.mode || settings.push);

    if (!mode) throw new StatusError(400, 'Illegal notifications mode');

    return roomMembershipService.setMembershipMode(userId, troupeId, mode, false)
      .then(function() {
        return generateResponse(userId, troupeId);
      });
  }

};
