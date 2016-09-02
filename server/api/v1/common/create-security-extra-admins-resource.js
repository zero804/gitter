'use strict';

var restSerializer = require("../../../serializers/rest-serializer");

function SecurityResourceExtraAdminsRoute(options) {
  this.id = options.id;
  this.subresources = options.subresources;
  this.subresourcesRoot = options.subresourcesRoot;

  this.getSecurityDescriptorWithPolicyService = options.getSecurityDescriptorWithPolicyService;
}

SecurityResourceExtraAdminsRoute.prototype.index = function(req) {
  return this.getSecurityDescriptorWithPolicyService(req)
    .then(function(sdService) {
      return sdService.listExtraAdmins();
    })
    .then(function(userIds) {
      var strategy = new restSerializer.UserIdStrategy({ });
      return restSerializer.serialize(userIds, strategy);
    });
}

// TODO: post/create
// TODO: delete by userId

module.exports = SecurityResourceExtraAdminsRoute;
