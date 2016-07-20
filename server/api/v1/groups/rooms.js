/* eslint complexity: ["error", 13] */
'use strict';

var assert = require('assert');
var StatusError = require('statuserror');
var restful = require('../../../services/restful')
var GroupWithPolicyService = require('../../../services/group-with-policy-service');
var restSerializer = require('../../../serializers/rest-serializer');


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

    if (!req.authInfo || req.authInfo.client.clientKey !== 'web-internal') {
      // This is a private API
      throw new StatusError(404);
    }

    var name = req.body.name ? String(req.body.name) : undefined;
    var topic = req.body.topic ? String(req.body.topic) : undefined;
    var createOptions = { name: name, topic: topic };
    if (req.body.security) {
      // PUBLIC or PRIVATE
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

    // req.body is json, so req.body.providers should already be an array if it
    // exists. it gets validated further inside GroupWithPolicyService.
    if (req.body.providers && Array.isArray(req.body.providers)) {
      createOptions.providers = req.body.providers;
    }

    // keep tracking info around for sendStats
    if (typeof req.body.source === 'string') {
      createOptions.tracking = { source: req.body.source };
    }

    var groupWithPolicyService = new GroupWithPolicyService(req.group, req.user, req.userGroupPolicy);
    return groupWithPolicyService.createRoom(createOptions)
      .then(function(results) {
        var room = results.troupe;
        var strategy = new restSerializer.TroupeStrategy({
          currentUserId: req.user.id,
          currentUser: req.user,
          includeRolesForTroupe: room,
          // include all these because it will replace the troupe in the context
          includeTags: true,
          includeProviders: true,
          includeGroups: true
        });

        return restSerializer.serializeObject(room, strategy);
      });
  }
};
