'use strict';

var assert = require('assert');
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
    if (!req.user) {
      throw new StatusError(401);
    }

    if (!req.authInfo || !req.authInfo.clientKey === 'web-internal') {
      // This is a private API
      throw new StatusError(404);
    }

    var name = String(req.body.name);
    var topic = String(req.body.topic);
    var createOptions = { name: name, topic: topic };
    if (req.body.security) {
      // PUBLIC, PRIVATE or INHERITED
      createOptions.security = req.body.security.security;
      assert(createOptions.security, 'security required');

      createOptions.type = req.body.security.type;
      if (createOptions.type) {
        // for GitHub and future room types that are backed by other services
        createOptions.linkPath = req.body.security.linkPath;
        assert(createOptions.linkPath, 'linkPath required');
      }
    } else {
      createOptions.security = 'PUBLIC';
    }

    var groupWithPolicyService = new GroupWithPolicyService(req.group, req.user, req.userGroupPolicy);
    return groupWithPolicyService.createRoom(createOptions);
  }
};
