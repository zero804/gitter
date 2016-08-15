"use strict";

var Promise = require('bluebird');
var getVersion = require('../get-model-version');
var UserIdStrategy = require('./user-id-strategy');

function formatDate(d) {
  return d ? d.toISOString() : null;
}

function CommentStrategy(options) {
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

  this.preload = function(comments) {
    if (comments.isEmpty()) return;

    var strategies = [];

    // TODO: no user strategy necessary if options.user is passed in
    userStrategy = new UserIdStrategy();
    var userIds = comments.map(function(i) { return i.userId; });
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

  this.map = function(comment) {
    var id = comment.id || comment._id && comment._id.toHexString();

    return {
      id: id,
      body: {
        text: comment.text,
        html: comment.html
      },

      // TODO: should we incude which topic/reply it is for?

      // TODO: support options.user
      user: mapUser(comment.userId),

      sent: formatDate(comment.sent),
      editedAt: comment.editedAt ? formatDate(comment.editedAt) : null,
      lastModified: comment.lastModified ? formatDate(comment.lastModified) : null,
      v: getVersion(comment)
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

CommentStrategy.prototype = {
  name: 'CommentStrategy',
};

module.exports = CommentStrategy;
