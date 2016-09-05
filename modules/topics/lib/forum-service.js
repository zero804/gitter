'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var Promise = require('bluebird');
var _ = require('lodash');
var StatusError = require('statuserror');
var Forum = require('gitter-web-persistence').Forum;
var Topic = require('gitter-web-persistence').Topic;
var validateForum = require('./validate-forum');
var validateTags = require('gitter-web-validators').validateTags;
var liveCollections = require('gitter-web-live-collection-events');


function findById(forumId) {
  return Forum.findById(forumId)
    .lean()
    .exec();
}

function createForum(user, forumInfo, securityDescriptor) {
  // we can't upsert because there's nothing unique on a Forum to check against
  var data = {
    tags: forumInfo.tags || [],
    sd: securityDescriptor
  };

  var insertData = validateForum(data);
  return Forum.create(insertData)
    .then(function(forum) {
      stats.event('new_forum', {
        // TODO: groupId would probably have been handy here? But leaky.
        forumId: forum._id,
        userId: user._id
      });

      return forum;
    });
}

/**
 * Private. It just does the partial update on a forum. Rather use setForumTags.
 */
function setTagsForForum(userId, forumId, tags) {
  var query = {
    _id: forumId
  };
  var update = {
    $set: {
      tags: tags
    }
  };
  return Forum.findOneAndUpdate(query, update, { new: true })
    .lean()
    .exec()
    .then(function(updatedForum) {
      // log a stats event
      stats.event('update_forum_tags', {
        userId: userId,
        forumId: forumId,
        tags: tags
      });

      // TODO: patch the forum live collection once we have one
      //liveCollections.forums.emit('patch', forumId, { tags: updatedForum.tags });

      return updatedForum;
    });
}

/**
 * Private. This is the partial update that removes tags from topics that might
 * have used them. Rather use setForumTags.
 */
function updateTopicsWithDeletedTags(userId, forumId, deletedTags) {
  if (!deletedTags.length) return [];

  /*
  Ideally there would be a way of doing the multi update and getting an array
  of the topic ids that were affected, then we could just load those out for a
  total of two queries, but it doesn't look like there's a way of doing that.

  So unfortunately it looks like we need to load the topic ids+tags before
  removing them so we know which topics to patch in the live collection
  afterwards.

  Also, this could get dangerous if we have many thousands of matches..
  */
  return Topic.find({
      tags: { $in: deletedTags }
    })
    .select('tags')
    .lean()
    .exec()
    .bind({
      topics: undefined
    })
    .then(function(topics) {
      this.topics = topics;

      // update them all in one query
      var query = {
        /*
        Alternatively we could just send the array of topic ids, but that won't
        be 100% transaction-safe in terms of updating all the existing topics.
        However this way, we could be updating more topics than what we'll end
        up logging events for and patching in the live collection..
        */
        tags: { $in: deletedTags}
      };

      var update = {
        $pull: {
          tags: { $in: deletedTags}
        }
      };

      return Topic.update(query, update, { multi: true });
    })
    .then(function() {
      var topics = this.topics;

      return Promise.map(topics, function(topic) {
        var topicId = topic._id;

        // figure out the tag sets after the update without doing another query
        // (This doesn't feel very transaction safe..)
        var updatedTags = _.difference(topic.tags, deletedTags);

        // While at it, fire off a bunch of stats events because all these
        // topics have now changed.
        stats.event('update_topic_tags', {
          userId: userId,
          forumId: forumId,
          topicId: topicId,
          tags: updatedTags
        });

        // Patch each of the topics that got changed in the topics live
        // collection.
        liveCollections.topics.emit('patch', forumId, topic._id, { tags: updatedTags });

        // return all the updated topics
        return {
          _id: topicId,
          tags: updatedTags
        }
      })
    });
}

function setForumTags(user, forum, tags) {
  tags = tags || [];

  if (!validateTags(tags)) {
    throw new StatusError(400, 'Tags are invalid.');
  }

  var oldTags = forum.tags || [];
  var userId = user._id;
  var forumId = forum._id;

  // update the forum with the new tags
  return setTagsForForum(userId, forumId, tags)
    .bind({
      forum: undefined
    })
    .then(function(updatedForum) {
      this.forum = updatedForum;

      // remove all tags from topics that don't exist anymore
      // (if there are any)
      var deletedTags = _.difference(oldTags, tags);
      return updateTopicsWithDeletedTags(userId, forumId, deletedTags);
    })
    .then(function() {
      return this.forum;
    });
}

module.exports = {
  findById: findById,
  createForum: Promise.method(createForum),
  setForumTags: Promise.method(setForumTags)
};
