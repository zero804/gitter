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

SecurityResourceExtraAdminsRoute.prototype.create = function(req) {
  var userId = req.body.id;
  // Validation....

  return this.getSecurityDescriptorWithPolicyService(req)
    .then(function(sdService) {
      return sdService.addExtraAdmin(userId);
    })
    .then(function() {
      var strategy = new restSerializer.UserIdStrategy({ });
      return restSerializer.serializeObject(userId, strategy);
    });
}

SecurityResourceExtraAdminsRoute.prototype.destroy = function(req, res) {
  var userId = req.params[this.id]
  return this.getSecurityDescriptorWithPolicyService(req)
    .then(function(sdService) {
      return sdService.removeExtraAdmin(userId);
    })
    .then(function() {
      res.status(204);
      return null;
    });
}

module.exports = SecurityResourceExtraAdminsRoute;
