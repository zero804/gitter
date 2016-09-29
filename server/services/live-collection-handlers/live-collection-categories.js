'use strict';

var _ = require('lodash');
var appEvents = require('gitter-web-appevents');
var restSerializer = require('../../serializers/rest-serializer');


function serializeCategoryToForum(operation, category) {
  var forumId = category.forumId;
  var url = '/forums/' + forumId + '/categories';

  var strategy = new restSerializer.ForumCategoryStrategy();
  return restSerializer.serializeObject(category, strategy)
    .then(function(serializedCategory) {
      appEvents.dataChange2(url, operation, serializedCategory, 'category');
    });
}

var liveCollectionCategories = {
  create: function(category) {
    return serializeCategoryToForum('create', category);
  },

  update: function(category) {
    return serializeCategoryToForum('update', category);
  },

  patch: function(forumId, categoryId, patch) {
    var url = '/forums/' + forumId + '/categories';
    var patchMessage = _.extend({ }, patch, { id: categoryId.toString() });
    appEvents.dataChange2(url, 'patch', patchMessage, 'category');
  },

  remove: function(category) {
    return this.removeId(category.forumId, category._id);
  },

  removeId: function(forumId, categoryId) {
    var url = '/forums/' + forumId + '/categories';
    appEvents.dataChange2(url, 'remove', { id: categoryId }, 'category');
  }
}

module.exports = liveCollectionCategories;
