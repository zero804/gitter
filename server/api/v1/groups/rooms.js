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

    var name = req.body.name ? String(req.body.name) : undefined;
    var topic = req.body.topic ? String(req.body.topic) : undefined;
    var createOptions = { name: name, topic: topic };
    if (req.body.security) {
      // PUBLIC, PRIVATE or INHERITED
      createOptions.security = req.body.security.security ? String(req.body.security.security) : undefined;
      assert(createOptions.security, 'security required');

      // type defaults to null, not undefined
      createOptions.type = req.body.security.type ? String(req.body.security.type) : null;
      if (createOptions.type) {
        // for GitHub and future room types that are backed by other services
        createOptions.linkPath = req.body.security.linkPath ? String(req.body.security.linkPath) : undefined;
        assert(createOptions.linkPath, 'linkPath required');
      }
    } else {
      createOptions.security = 'PUBLIC';
    }

    // keep tracking info around for sendStats
    if (typeof req.body.source === 'string') {
      createOptions.tracking = { source: req.body.source };
    }

    var groupWithPolicyService = new GroupWithPolicyService(req.group, req.user, req.userGroupPolicy);
    return groupWithPolicyService.createRoom(createOptions);
  }
};
