"use strict";

var _ = require('lodash');
var appEvents = require('gitter-web-appevents');
var restSerializer = require("../../serializers/rest-serializer");


function serializeTopicToForum(operation, topic) {
  var forumId = topic.forumId;
  var url = "/forums/" + forumId + "/topics";

  var strategy = new restSerializer.TopicStrategy({
    includeRepliesTotals: true
  });
  return restSerializer.serializeObject(topic, strategy)
    .then(function(serializedTopic) {
      appEvents.dataChange2(url, operation, serializedTopic, 'topic');
    });
}

var liveCollectionTopics = {
  create: function(topic) {
    return serializeTopicToForum("create", topic);
  },

  update: function(topic) {
    return serializeTopicToForum("update", topic);
  },

  patch: function(forumId, topicId, patch) {
    var url = "/forums/" + forumId + "/topics";
    var patchMessage = _.extend({ }, patch, { id: topicId.toString() });
    appEvents.dataChange2(url, "patch", patchMessage, 'topic');
  },

  remove: function(topic) {
    return this.removeId(topic.forumId, topic._id);
  },

  removeId: function(forumId, topicId) {
    var url = "/forums/" + forumId + "/topics";
    appEvents.dataChange2(url, "remove", { id: topicId }, 'topic');
  }
}

module.exports = liveCollectionTopics;
