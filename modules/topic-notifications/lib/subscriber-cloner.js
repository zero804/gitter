'use strict';

var ForumSubscription = require('gitter-web-persistence').ForumSubscription;
var _ = require('lodash');
var subscriberService = require('./subscriber-service');

function cloneSubscribers(fromForumObject, toForumObject, extraUserIds) {
  // Copy all non-automatic subscribers from the parent object
  return subscriberService.listForItem(fromForumObject, { auto: false })
    .then(function(userIds) {
      var extraUserIdsSet = extraUserIds && _.reduce(extraUserIds, function(memo, userId) {
        memo[userId] = true;
        return memo;
      }, {});

      var results = _.map(userIds, function(userId) {
        var inExtraUsers;
        if (extraUserIdsSet) {
          inExtraUsers = extraUserIdsSet[userId];
          delete extraUserIdsSet[userId];
        } else {
          inExtraUsers = false;
        }

        return {
          userId: userId,
          forumId: toForumObject.forumId,
          topicId: toForumObject.topicId,
          replyId: toForumObject.replyId,
          auto: !inExtraUsers
        }
      });

      // Additional users not covered by the clone...
      if (extraUserIdsSet) {
        Object.keys(extraUserIdsSet).forEach(function(userId) {
          results.push({
            userId: userId,
            forumId: toForumObject.forumId,
            topicId: toForumObject.topicId,
            replyId: toForumObject.replyId,
            auto: false
          })
        })
      }


      return ForumSubscription.insertMany(results)
        .return(results);
    })
    .then(function(results) {
      return _.map(results, function(f) {
        return f.userId;
      });
    })

}

module.exports = cloneSubscribers;
