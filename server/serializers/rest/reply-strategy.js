"use strict";

var Promise = require('bluebird');
var getVersion = require('../get-model-version');
var UserIdStrategy = require('./user-id-strategy');

function formatDate(d) {
  return d ? d.toISOString() : null;
}

function ReplyStrategy(options) {
  options = options || {};

  // useLookups will be set to true if there are any lookups that this strategy
  // understands.
  var useLookups = false;
  var userLookups;
  if (options.lookups) {
    if (options.lookups.indexOf('user') !== -1) {
      useLookups = true;
      userLookups = {};
    }
  }

  var userStrategy;

  this.preload = function(replies) {
    if (replies.isEmpty()) return;

    var strategies = [];

    // TODO: no user strategy necessary if options.user is passed in
    userStrategy = new UserIdStrategy();
    var userIds = replies.map(function(i) { return i.userId; });
    strategies.push(userStrategy.preload(userIds));

    return Promise.all(strategies);
  };

  function mapUser(userId) {
    if (userLookups) {
      if (!userLookups[userId]) {
        userLookups[userId] = userStrategy.map(userId);
      }

      return userId;
    } else {
      return userStrategy.map(userId);
    }
  }

  this.map = function(reply) {
    var id = reply.id || reply._id && reply._id.toHexString();

    return {
      id: id,
      text: reply.text,
      html: reply.html,
      // TODO: should we incude which topic it is for?
      // TODO: support options.user
      user: mapUser(reply.userId),
      sent: formatDate(reply.sent),
      editedAt: reply.editedAt ? formatDate(reply.editedAt) : null,
      lastModified: reply.lastModified ? formatDate(reply.lastModified) : null,
      v: getVersion(reply),
      // TODO: fill out the unimplemented fake fields
    };
  };

  this.postProcess = function(serialized) {
    if (useLookups) {
      return {
        items: serialized.toArray(),
        lookups: {
          users: userLookups
        }
      };
    } else {
      return serialized.toArray();
    }
  }
}

ReplyStrategy.prototype = {
  name: 'ReplyStrategy',
};

module.exports = ReplyStrategy;
