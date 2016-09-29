'use strict';

var ForumWithPolicyService = require('../../../services/forum-with-policy-service');

function ReactionsResource(options) {
  this.id = options.id;

  this.getForumObject = options.getForumObject;
}

ReactionsResource.prototype.index = function(req) {
  var forumWithPolicyService = this._getForumWithPolicy(req);

  return forumWithPolicyService.listReactions(this.getForumObject(req))
    .then(function(reactions) {
      return reactions;
    });
}

ReactionsResource.prototype.create = function(req) {
  var forumWithPolicyService = this._getForumWithPolicy(req);
  var reaction = req.body.reaction ? String(req.body.reaction) : undefined;

  return forumWithPolicyService.addReaction(this.getForumObject(req), reaction)
    .then(function(reactions) {
      return reactions;
    });
}

ReactionsResource.prototype.destroy = function(req) {
  var reaction = req.params[this.id];

  var forumWithPolicyService = this._getForumWithPolicy(req);
  return forumWithPolicyService.removeReaction(this.getForumObject(req), reaction)
    .then(function(reactions) {
      return reactions;
    });
}

ReactionsResource.prototype._getForumWithPolicy = function(req) {
  return new ForumWithPolicyService(req.forum, req.user, req.userForumPolicy);
}

module.exports = ReactionsResource;
