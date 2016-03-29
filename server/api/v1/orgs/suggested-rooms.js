'use strict';

var Promise = require('bluebird');
var _ = require('lodash');
var suggestions    = require('gitter-web-suggestions');
var restSerializer = require('../../../serializers/rest-serializer');
var troupeService = require('../../../services/troupe-service');
var roomMembershipService = require('../../../services/room-membership-service');
var collections = require('../../../utils/collections');

module.exports = {
  index: function(req) {
    var userId  = req.user._id;
    var orgName = req.params.orgName.toLowerCase();
    return Promise.join(
        troupeService.findChildRoomsForOrg(orgName, {security: 'PUBLIC'}),
        roomMembershipService.findRoomIdsForUser(userId),
        function(rooms, existingRoomIds) {
          var idMap = collections.hashArray(existingRoomIds);

          var suggestions = _.reject(rooms, function(room) {
            return idMap[room.id];
          });

          return restSerializer.serialize(suggestions, new restSerializer.SuggestedRoomStrategy({ }));
        }
      );
  },
};
