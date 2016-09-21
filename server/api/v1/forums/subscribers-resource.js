'use strict';

var restSerializer = require("../../../serializers/rest-serializer");
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var StatusError = require('statuserror');
var ForumWithPolicyService = require('../../../services/forum-with-policy-service');

function SubscribersResource(options) {
  this.id = options.id;

  this.getForumObject = options.getForumObject;
}

/**
 * List extraAdmins on a descriptor
 */
SubscribersResource.prototype.index = function(req) {
  var forumWithPolicyService = this._getForumWithPolicy(req);
  return forumWithPolicyService.listSubscribers(this.getForumObject(req))
    .then(function(userIds) {
      var strategy = new restSerializer.UserIdStrategy({ });
      return restSerializer.serialize(userIds, strategy);
    });
}

/**
 * Subscribe
 */
SubscribersResource.prototype.create = function(req) {
  var forumWithPolicyService = this._getForumWithPolicy(req);

  // For now you can only subscribe yourself
  return forumWithPolicyService.subscribe(this.getForumObject(req))
    .then(function() {
      var strategy = new restSerializer.UserIdStrategy({ });
      return restSerializer.serializeObject(req.user._id, strategy);
    });
}

/**
 * Unsubscribe
 */
SubscribersResource.prototype.destroy = function(req, res) {
  var userId = req.params[this.id];

  // For now you can only unsubscribe yourself
  if (!mongoUtils.objectIDsEqual(userId, req.user._id)) {
    throw new StatusError(403);
  }

  var forumWithPolicyService = this._getForumWithPolicy(req);
  return forumWithPolicyService.unsubscribe(this.getForumObject(req))
    .then(function() {
      res.status(204);
      return null;
    });
}
/**
 * Unsubscribe
 */
SubscribersResource.prototype._getForumWithPolicy = function(req) {
  return new ForumWithPolicyService(req.forum, req.user, req.userForumPolicy);
}


module.exports = SubscribersResource;
