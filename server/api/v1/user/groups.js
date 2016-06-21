"use strict";

var restful = require("../../../services/restful");
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var StatusError = require('statuserror');
var policyFactory = require('gitter-web-permissions/lib/legacy-policy-factory');
var groupService = require('gitter-web-groups/lib/group-service');

module.exports = {
  id: 'userGroup',

  index: function(req) {
    if(!req.user) throw new StatusError(401);

    return restful.serializeGroupsForUserId(req.user._id);
  },

  load: function(req, id) {
    if(!mongoUtils.isLikeObjectId(id)) throw new StatusError(400);

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
  }
};
