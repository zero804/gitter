/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var restful = require("../../services/restful");

module.exports = {
  base: 'recentRooms',
  id: 'recentRoom',
  index: function(req, res, next) {
    return restful.serializeRecentRoomsForUser(req.resourceUser.id)
      .then(function(serialized) {
        res.send(serialized);
      })
      .fail(next);
  },

  load: function(req, id, callback) {
    // TODO: fix
    callback(null, true);

    // troupeService.findById(id, function(err, troupe) {
    //   if(err) return callback(500);
    //   if(!troupe) return callback(404);

    //   if(!troupeService.userHasAccessToTroupe(req.resourceUser, troupe)) {
    //     return callback(403);
    //   }

    //   return callback(null, troupe);
    // });
  }

};
