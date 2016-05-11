'use strict';

var _ = require('lodash');
var getMaxTagLength = require('gitter-web-shared/validation/validate-tag').getMaxTagLength;
var secureMethod = require('../utils/secure-method');

var MAX_RAW_TAGS_LENGTH = 200;

/**
 * This could do with a better name
 */
function RoomWithPolicyService(room, user, policy) {
  this.room = room;
  this.user = user;
  this.policy = policy;
}

function allowStaff() {
  return this.user && this.user.staff;
}

function allowAdmin() {
  return this.policy.canAdmin();
}

/**
 * Allow staff or admins to update the tags for a room
 * @return {Promise} Promise of room
 */
RoomWithPolicyService.prototype.updateTags = secureMethod([allowStaff, allowAdmin], function(tags) {
  var reservedTagTestRegex = (/:/);
  var isStaff = this.user.staff;
  var room = this.room;

  var cleanTags = tags.trim().slice(0, MAX_RAW_TAGS_LENGTH).split(',')
    .filter(function(tag) {
      return !!tag; //
    })
    .map(function(tag) {
      return tag.trim().slice(0, getMaxTagLength(isStaff));
    })
    .filter(function(tag) {
      // staff can do anything
      if(isStaff) {
        return true;
      }
      // Users can only save, non-reserved tags
      if(!reservedTagTestRegex.test(tag)) {
        return true;
      }

      return false;
    });

  // Make sure a normal user doesn't clear out our already existing reserved-word(with colons) tags
  var reservedTags = [];
  if(!isStaff) {
    reservedTags = room.tags
      .filter(function(tag) {
        return reservedTagTestRegex.test(tag);
      });
  }

  room.tags = [].concat(cleanTags, reservedTags);

  return room.save();
});

/**
 * Allow admins to change the topic of a room
 */
RoomWithPolicyService.prototype.updateTopic = secureMethod(allowAdmin, function(topic) {
  var room = this.room;
  room.topic = topic;
  return room.save();
});

/**
 * Allow admins and staff to change the providers for a room
 */
RoomWithPolicyService.prototype.updateProviders = secureMethod([allowStaff, allowAdmin], function(providers) {
  var room = this.room;

  // strictly validate the list of providers
  var filtered = _.uniq(providers.filter(function(provider) {
    // only github is allowed for now
    return (provider === 'github');
  }));

  if (filtered.length) {
    room.providers = filtered;
  } else {
    room.providers = undefined;
  }

  return room.save();
});

/**
 * Allow admins and staff to toggle search indexing on a room
 */
RoomWithPolicyService.prototype.toggleSearchIndexing = secureMethod(allowAdmin, function(bool) {
  var room = this.room;
  room.noindex = bool;

  return room.save();
});

module.exports = RoomWithPolicyService;
