"use strict";

var _ = require('lodash');
var appEvents = require('gitter-web-appevents');
var restSerializer = require("../../serializers/rest-serializer");


function serializeTopicToForum(operation, topic) {
  var forumId = topic.forumId;
  var url = "/forums/" + forumId + "/topics";

  var strategy = new restSerializer.TopicStrategy();
  return restSerializer.serializeObject(topic, strategy)
    .then(function(serializedTopic) {
      appEvents.dataChange2(url, operation, serializedTopic, 'topic');
    });
}

var liveCollectionTopics = {
  create: function(topic) {
    return serializeTopicToForum("create", topic);
  },

  // TODO: actually call update
  update: function(topic) {
    return serializeTopicToForum("update", topic);
  },

  // TODO: call patch
  patch: function(topicId, forumId, patch) {
    var url = "/forums/" + forumId + "/topics";
    var patchMessage = _.extend({ }, patch, { id: topicId });
    appEvents.dataChange2(url, "patch", patchMessage, 'topic');
  },

  remove: function(topic) {
    return this.removeId(topic._id, topic.forumId);
  },

  removeId: function(topicId, forumId) {
    var url = "/forums/" + forumId + "/topics";
    appEvents.dataChange2(url, "remove", { id: topicId }, 'topic');
  }
}

module.exports = liveCollectionTopics;
