"use strict";

var StatusError = require('statuserror');
var fonts = require('../../web/fonts');

var groupService = require('gitter-web-groups');
var forumService = require('gitter-web-topics/lib/forum-service');
var topicService = require('gitter-web-topics/lib/topic-service');
var getTopicsFilterSortOptions = require('gitter-web-topics/lib/get-topics-filter-sort-options');

var forumCategoryStore = require('gitter-web-topics-ui/server/stores/forum-category-store');
var forumTagStore = require('gitter-web-topics-ui/server/stores/forum-tag-store');
var forumTopicsStore = require('gitter-web-topics-ui/server/stores/topics-store');
var forumStore = require('gitter-web-topics-ui/server/stores/forum-store');
var accessTokenStore = require('gitter-web-topics-ui/server/stores/access-token-store');
var repliesStore = require('gitter-web-topics-ui/server/stores/replies-store');
var currentUserStore = require('gitter-web-topics-ui/server/stores/current-user-store');
var commentsStore = require('gitter-web-topics-ui/server/stores/comments-store');
var newCommentStore = require('gitter-web-topics-ui/server/stores/new-comment-store');

var navConstants = require('gitter-web-topics-ui/shared/constants/navigation');

var restSerializer = require('../../serializers/rest-serializer');
var contextGenerator = require('../../web/context-generator.js');


function renderForum(req, res, next, options) {
  var userId = req.user && req.user._id;

  options = (options || {});
  var groupUri = req.params.groupUri;

  return contextGenerator.generateNonChatContext(req)
    .bind({
      context: null
    })
    .then(function(context) {
      this.context = context;
      return groupService.findByUri(groupUri)
    })
    .then(function(group){
      if (!group) throw new StatusError(404, 'Group not found.');
      if (!group.forumId) throw new StatusError(404, 'Forum not found.');

      return forumService.findById(group.forumId);
    })
    .then(function(forum) {
      if(!forum) throw new StatusError(404, 'Forum not found');

      var strategy = restSerializer.ForumStrategy.nested({
        currentUserId: userId,
        topicsFilterSort: getTopicsFilterSortOptions(req.query)
      });

      return restSerializer.serializeObject(forum, strategy);
    })
    .then(function(forum) {
      var categoryName = (req.params.categoryName || navConstants.DEFAULT_CATEGORY_NAME);
      var filterName = (req.query.filter || navConstants.DEFAULT_FILTER_NAME);
      var tagName = (req.query.tag || navConstants.DEFAULT_TAG_NAME);
      var sortName = (req.query.sort || navConstants.DEFAULT_SORT_NAME);
      var createTopic = (options.createTopic || false);
      var context = this.context;

      return res.render('topics/forum', {
        layout: 'topics-layout',
        hasCachedFonts: fonts.hasCachedFonts(req.cookies),
        fonts: fonts.getFonts(),
        componentData: {
          forum: forum,
          context: context,

          groupUri: req.params.groupUri,
          categoryName: categoryName,
          filterName: filterName,
          tagName: tagName,
          sortName: sortName,

          createTopic: createTopic,

          categoryStore: forumCategoryStore(forum.categories, categoryName),
          tagStore: forumTagStore(forum.tags, tagName),
          topicsStore: forumTopicsStore(forum.topics, categoryName, tagName, filterName, sortName, context.user, createTopic),
          forumStore: forumStore(forum),
          accessTokenStore: accessTokenStore(context.accessToken),
          currentUserStore: currentUserStore(context.user),
        }
      });
    })
    .catch(next);
}

function renderTopic(req, res, next) {
  var groupUri = req.params.groupUri;
  var topicId = req.params.topicId;
  var userId = req.user && req.user._id;

  return contextGenerator.generateNonChatContext(req)
    .bind({
      context: null,
      group: null,
      forum: null
    })
    .then(function(context) {
      this.context = context;
      return groupService.findByUri(groupUri);
    })
    .then(function(group) {
      if (!group) throw new StatusError(404, 'Group not found.');
      if (!group.forumId) throw new StatusError(404, 'Forum not found.');

      this.group = group;
      return forumService.findById(group.forumId);
    })
    .then(function(forum) {
      if(!forum) throw new StatusError(404, 'Forum not found');
      // TODO: how do we know which topics options to pass in to the
      // forum strategy? Maybe it shouldn't include any topics at all?

      var strategy = restSerializer.ForumStrategy.nested({
        currentUserId: userId,
        topicsFilterSort: null
      });

      return restSerializer.serializeObject(forum, strategy);
    })
    .then(function(forum) {
      this.forum = forum;
      var group = this.group;
      return topicService.findByIdForForum(group.forumId, topicId);
    })
    .then(function(topic) {
      if (!topic) throw new StatusError(404, 'Topic not found.');

      var strategy = restSerializer.TopicStrategy.nested({
        currentUserId: userId
      });

      return restSerializer.serializeObject(topic, strategy);
    })
    .then(function(topic) {
      var forum = this.forum;
      var context = this.context;

      var topicStore = forumTopicsStore([topic]);
      return res.render('topics/topic', {
        layout: 'topics-layout',
        hasCachedFonts: fonts.hasCachedFonts(req.cookies),
        fonts: fonts.getFonts(),
        componentData: {
          forum: this.forum,
          context: context,
          groupUri: req.params.groupUri,
          topicsStore: topicStore,
          topicId: topicId,
          accessTokenStore: accessTokenStore(context.accessToken),
          currentUserStore: currentUserStore(context.user),
          repliesStore: repliesStore(topic.replies),
          categoryStore: forumCategoryStore(forum.categories),
          tagStore: forumTagStore(forum.tags),
          forumStore: forumStore(forum),
          commentsStore: commentsStore([]),
          newCommentStore: newCommentStore(),
        }
      });
    })
    .catch(next);
}

module.exports = {
  renderForum: renderForum,
  renderTopic: renderTopic,
};
