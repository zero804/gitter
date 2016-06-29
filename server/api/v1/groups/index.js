"use strict";

var restful = require("../../../services/restful");
var StatusError = require('statuserror');
var groupService = require('gitter-web-groups/lib/group-service');
var restSerializer = require('../../../serializers/rest-serializer');
var policyFactory = require('gitter-web-permissions/lib/policy-factory');

module.exports = {
  id: 'group',

  index: function(req) {
    if (!req.user) {
      throw new StatusError(401);
    }

    return restful.serializeGroupsForUserId(req.user._id);
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

    var uri = req.body.uri ? String(req.body.uri) : undefined;
    var name = req.body.name ? String(req.body.name) : undefined;
    var createOptions = { uri: uri, name: name };
    if (req.body.security) {
      // for GitHub and future group types that are backed by other services
      createOptions.type = req.body.security.type ? String(req.body.security.type) : undefined;
      createOptions.linkPath = req.body.security.linkPath ? String(req.body.security.linkPath) : undefined
    }
    return groupService.createGroup(user, createOptions);
  },

  show: function(req) {
    var group = req.params.group;
    var user = req.user;
    var userId = user && user._id;

    var strategy = new restSerializer.GroupStrategy({ currentUserId: userId, currentUser: user });
    return restSerializer.serializeObject(group, strategy);
  },

  load: function(req, id) {
    return policyFactory.createPolicyForGroupId(req.user, id)
      .then(function(policy) {
        // TODO: middleware?
        req.userGroupPolicy = policy;

        return req.method === 'GET' ?
          policy.canRead() :
          policy.canWrite();
      })
      .then(function(access) {
        if (!access) return null;

        return groupService.findById(id);
      });
  },

  subresources: {
    'rooms': require('./rooms'),
  }

};
