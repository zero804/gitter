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
      var strategy = new restSerializer.SecurityDescriptorStrategy({ });
      return restSerializer.serializeObject(securityDescriptor, strategy);
    });
}

SecurityResourceRoute.prototype.updateRoot = function(req) {
  return this.getSecurityDescriptorWithPolicyService(req)
    .then(function(sdService) {
      var change = req.body; // TODO: add validation here
      return sdService.update(change);
    })
    .then(function(securityDescriptor) {
      var strategy = new restSerializer.SecurityDescriptorStrategy({ });
      return restSerializer.serializeObject(securityDescriptor, strategy);
    });
}

module.exports = SecurityResourceRoute;
