'use strict';

var assert = require('assert');
var slugify = require('slug');
var StatusError = require('statuserror');
var ensureAccessAndFetchDescriptor = require('gitter-web-permissions/lib/ensure-access-and-fetch-descriptor');
var Troupe = require('gitter-web-persistence').Troupe;
var debug = require('debug')('gitter:app:group-with-policy-service');
var roomService = require('./room-service');
var secureMethod = require('../utils/secure-method');
var validateRoomName = require('gitter-web-validators/lib/validate-room-name');
var validateProviders = require('gitter-web-validators/lib/validate-providers');
var groupService = require('gitter-web-groups/lib/group-service');
var forumService = require('gitter-web-forums/lib/forum-service');
var forumCategoryService = require('gitter-web-forum-categories/lib/forum-category-service');
var postService = require('gitter-web-posts/lib/post-service');


/**
 * @private
 */
function validateRoomSecurity(type, security) {
  if (security === 'PUBLIC' || security === 'PRIVATE') {
    return true;
  }
  return false;
}

/**
 * This could do with a better name
 */
function GroupWithPolicyService(group, user, policy) {
  assert(group, 'Group required');
  assert(policy, 'Policy required');
  this.group = group;
  this.user = user;
  this.policy = policy;
}

function allowAdmin() {
  return this.policy.canAdmin();
}

function findByUri(uri) {
  assert(uri, 'uri required');
  return Troupe.findOne({ lcUri: uri.toLowerCase() })
    .lean()
    .exec();
}

function ensureAccessAndFetchRoomInfo(user, group, options) {
  options = options || {};

  var providers = options.providers;
  if (providers && !validateProviders(providers)) {
    throw new StatusError(400, 'Invalid providers ' + providers.toString());
  }

  var type = options.type || null;

  var security = options.security;
  assert(security, 'security required');

  if (!validateRoomSecurity(type, security)) {
    throw new StatusError(400, 'Invalid room security for ' + type +': '+ security);
  }

  var topic = options.topic;
  // TODO: validate topic

  var name = options.name;

  if (!validateRoomName(name)) {
    throw new StatusError(400, 'Invalid room name: ' + name);
  }

  var uri = group.uri + '/' + name;

  return findByUri(uri)
    .then(function(room) {
      if (room) {
        throw new StatusError(400, 'Room uri already taken: ' + uri);
      }

      return ensureAccessAndFetchDescriptor(user, options)
        .then(function(securityDescriptor) {
          return [{
            topic: topic,
            uri: uri,
            providers: providers
          }, securityDescriptor];
        });
    })
}


/**
 * Allow admins to create a new room
 * @return {Promise} Promise of room
 */
GroupWithPolicyService.prototype.createRoom = secureMethod([allowAdmin], function(options) {
  var user = this.user;
  var group = this.group;

  if (options.type && group.sd.type !== 'GH_ORG' && group.sd.type !== 'GH_REPO' && group.sd.type !== 'GH_USER') {
    throw new StatusError(400, 'GitHub repo backed rooms can only be added to GitHub org, repo or user backed groups.');
  }

  if (options.linkPath) {
    if (options.linkPath.split('/')[0] !== group.sd.linkPath.split('/')[0]) {
      throw new StatusError(400, 'GitHub repo backed rooms must be for the same owner (gh org or user) as the group.');
    }
  }

  return ensureAccessAndFetchRoomInfo(user, group, options)
    .spread(function(roomInfo, securityDescriptor) {
      debug("Upserting %j", roomInfo);
      return roomService.createGroupRoom(user, group, roomInfo, securityDescriptor, {
        tracking: options.tracking,
        runPostGitHubRoomCreationTasks: options.runPostGitHubRoomCreationTasks
      })
    })
    .then(function(results) {
      return results.troupe;
    });
});

function getDefaultCategoryOptions(forumUri, options) {
  options = options || {};

  options.name = options.name || 'General';
  options.slug = options.slug || slugify(options.name);

  // TODO: validate name, slug

  return options;
}

/**
 * Allow admins to create a new forum
 * @return {Promise} Promise of forum
 */
GroupWithPolicyService.prototype.createForum = secureMethod([allowAdmin], function(options) {
  var user = this.user;
  var group = this.group;

  if (!options.name) {
    throw new StatusError(400, 'name required');
  }

  options.slug = options.slug || slugify(options.name);

  // TODO: validate forum name & uri

  options.defaultCategory = getDefaultCategoryOptions(options.defaultTopic);

  // For now we only allow one forum per group.
  // We don't upsert into the existing one either.
  if (group.forumId) {
    throw new StatusError(400, 'Group already has a forum.');
  }

  // TODO: check that no forum with the specified uri exists. Not that it
  // should  if we filled in group.forumId, but you never know..

  var forumInfo = {
    name: options.name,
    slug: options.slug,
  };

  return forumService.createForum(user, forumInfo)
    .bind({
      forum: null,
      category: null,
      topic: null
    })
    .then(function(forum) {
      this.forum = forum;

      // store the forum as the group's forum
      return groupService.setForumForGroup(group._id, forum._id);
    })
    .then(function() {
      var forum = this.forum;

      // create the default category
      var categoryInfo = {
        name: options.defaultCategory.name,
        slug: options.defaultCategory.slug
      };

      // TODO: forumWithPolicyService?
      return forumCategoryService.createCategory(user, forum, categoryInfo);
    })
    .then(function(category) {
      // send all these so we can return them all serialized together
      return {
        forum: this.forum,
        defaultCategory: category
      }
    });
});

GroupWithPolicyService.prototype.setAvatar = secureMethod([allowAdmin], function(url) {
  groupService.setAvatarForGroup(this.group._id, url);
});

module.exports = GroupWithPolicyService;
