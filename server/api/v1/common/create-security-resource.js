'use strict';

var restSerializer = require("../../../serializers/rest-serializer");

function SecurityResourceRoute(options) {
  this.id = options.id;
  this.subresources = options.subresources;
  this.subresourcesRoot = options.subresourcesRoot;

  this.getSecurityDescriptorWithPolicyService = options.getSecurityDescriptorWithPolicyService;
}

SecurityResourceRoute.prototype.index = function(req) {
  return this.getSecurityDescriptorWithPolicyService(req)
    .then(function(sdService) {
      return sdService.get();
    })
    .then(function(securityDescriptor) {
      var strategy = restSerializer.SecurityDescriptorStrategy.full();
      return restSerializer.serializeObject(securityDescriptor, strategy);
    });
}

SecurityResourceRoute.prototype.updateRoot = function(req) {
  return this.getSecurityDescriptorWithPolicyService(req)
    .then(function(sdService) {
      var newType = req.body.type;
      return sdService.updateType(newType);
    })
    .then(function(securityDescriptor) {
      var strategy = restSerializer.SecurityDescriptorStrategy.full()
      return restSerializer.serializeObject(securityDescriptor, strategy);
    });
}

module.exports = SecurityResourceRoute;
