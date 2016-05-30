'use strict';

var StatusError = require('statuserror');
var restful = require('../../../services/restful')
var GroupWithPolicyService = require('../../../services/group-with-policy-service');

module.exports = {
  id: 'groupRoom',

  index: function(req) {
    var groupId = req.group._id;
    var user = req.user;
    var userId = user && user._id;

    return restful.serializeRoomsForGroupId(groupId, userId);
  },

  create: function(req) {
    var user = req.user;

    if (!req.user) {
      throw new StatusError(401);
    }

    if (!req.authInfo || !req.authInfo.clientKey === 'web-internal') {
      // This is a private API
      throw new StatusError(404);
    }

    var uri = String(req.body.uri);
    var topic = String(req.body.topic);
    var createOptions = { uri: uri, topic: topic };
    if (req.body.security) {
      createOptions.public = req.body.security.public;

      // for GitHub and future rom types that are backed by other services
      createOptions.type = req.body.security.type;
      createOptions.linkPath = req.body.security.linkPath;
    }

    var groupWithPolicyService = new GroupWithPolicyService(req.group, req.user, req.userGroupPolicy);
    return groupWithPolicyService.createRoom(createOptions);
  }
};
