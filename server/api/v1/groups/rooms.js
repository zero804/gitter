'use strict';

var restful = require('../../../services/restful')

module.exports = {
  id: 'groupRoom',

  index: function(req) {
    var groupId = req.params.group._id;
    var user = req.user;
    var userId = user && user._id;

    return restful.serializeRoomsForGroupId(groupId, userId);
  }
};
