"use strict";

var Promise = require('bluebird');
var StatusError = require('statuserror');
var fonts = require('../../web/fonts');

var groupService = require('gitter-web-groups');
var forumService = require('gitter-web-topics/lib/forum-service');
var topicService = require('gitter-web-topics/lib/topic-service');
var getTopicsFilterSortOptions = require('gitter-web-topics/lib/get-topics-filter-sort-options');

var groupStore = require('gitter-web-topics-ui/server/stores/group-store');
var forumStore = require('gitter-web-topics-ui/server/stores/forum-store');
var currentUserStore = require('gitter-web-topics-ui/server/stores/current-user-store');
var accessTokenStore = require('gitter-web-topics-ui/server/stores/access-token-store');
var forumCategoryStore = require('gitter-web-topics-ui/server/stores/forum-category-store');
var forumTagStore = require('gitter-web-topics-ui/server/stores/forum-tag-store');
var forumTopicsStore = require('gitter-web-topics-ui/server/stores/topics-store');
var repliesStore = require('gitter-web-topics-ui/server/stores/replies-store');
var commentsStore = require('gitter-web-topics-ui/server/stores/comments-store');
var newCommentStore = require('gitter-web-topics-ui/server/stores/new-comment-store');
var newReplyStore = require('gitter-web-topics-ui/server/stores/new-reply-store');

var navConstants = require('gitter-web-topics-ui/shared/constants/navigation');

var restSerializer = require('../../serializers/rest-serializer');
var contextGenerator = require('../../web/context-generator.js');
var generateProfileMenuSnapshot = require('../snapshots/profile-menu-snapshot');


function renderForum(req, res, next, options) {
  var userId = req.user && req.user._id;

  options = (options || {});
  var groupUri = req.params.groupUri;

  return Promise.props({
      context: contextGenerator.generateNonChatContext(req),
      group: groupService.findByUri(groupUri),
      profileMenuSnapshot: generateProfileMenuSnapshot(req),
    })
    .bind({
      context: null,
      serializedGroup: null,
      serializedForum: null,
      profileMenuSnapshot: {},
    })
    .then(function(result) {
      this.context = result.context;
      this.profileMenuSnapshot = result.profileMenuSnapshot;
      var group = result.group;

      if (!group) throw new StatusError(404, 'Group not found.');
      if (!group.forumId) throw new StatusError(404, 'Forum not found.');

      var user = req.user;
      var groupStrategy = new restSerializer.GroupStrategy({
        currentUserId: user && user._id,
        currentUser: user
      });

      return Promise.props({
        serializedGroup: restSerializer.serializeObject(group, groupStrategy),
        forum: forumService.findById(group.forumId)
      });
    })
    .then(function(result) {
      this.serializedGroup = result.serializedGroup;
      var forum = result.forum;

      if(!forum) throw new StatusError(404, 'Forum not found');

      var strategy = restSerializer.ForumStrategy.nested({
        currentUserId: userId,
        topicsFilterSort: getTopicsFilterSortOptions(req.query)
      });

      return restSerializer.serializeObject(forum, strategy);
    })
    .then(function(serializeForum) {
      this.serializedForum = serializeForum;

      var context = this.context;
      var group = this.serializedGroup;
      var forum = this.serializedForum;

      var categoryName = (req.params.categoryName || navConstants.DEFAULT_CATEGORY_NAME);
      var filterName = (req.query.filter || navConstants.DEFAULT_FILTER_NAME);
      var tagName = (req.query.tag || navConstants.DEFAULT_TAG_NAME);
      var sortName = (req.query.sort || navConstants.DEFAULT_SORT_NAME);
      var createTopic = (options.createTopic || false);

      return res.render('topics/forum', {
        layout: 'topics-layout',
        hasCachedFonts: fonts.hasCachedFonts(req.cookies),
        hasDarkTheme: this.profileMenuSnapshot.hasDarkTheme,
        fonts: fonts.getFonts(),
        componentData: {
          forum: forum,
          context: context,

          groupName: group.name,
          groupUri: req.params.groupUri,
          categoryName: categoryName,
          filterName: filterName,
          tagName: tagName,
          sortName: sortName,

          createTopic: createTopic,

          groupStore: groupStore(group),
          forumStore: forumStore(forum),
          accessTokenStore: accessTokenStore(context.accessToken),
          currentUserStore: currentUserStore(context.user),
          categoryStore: forumCategoryStore(forum.categories, categoryName),
          tagStore: forumTagStore(forum.tags, tagName),
          topicsStore: forumTopicsStore(forum.topics, categoryName, tagName, filterName, sortName, context.user, createTopic),
        }
      });
    })
    .catch(next);
}

function renderTopic(req, res, next) {
  var groupUri = req.params.groupUri;
  var topicId = req.params.topicId;
  var userId = req.user && req.user._id;

  return Promise.props({
      context: contextGenerator.generateNonChatContext(req),
      group: groupService.findByUri(groupUri),
      profileMenuSnapshot: generateProfileMenuSnapshot(req)
    })
    .bind({
      context: null,
      serializedGroup: null,
      serializedForum: null,
      serializedTopic: null,
      profileMenuSnapshot: {},
    })
    .then(function(result) {
      this.context = result.context;
      this.profileMenuSnapshot = result.profileMenuSnapshot;
      var group = result.group;

      if (!group) throw new StatusError(404, 'Group not found.');
      if (!group.forumId) throw new StatusError(404, 'Forum not found.');

      var user = req.user;
      var groupStrategy = new restSerializer.GroupStrategy({
        currentUserId: user && user._id,
        currentUser: user
      });

      return Promise.props({
        serializedGroup: restSerializer.serializeObject(group, groupStrategy),
        forum: forumService.findById(group.forumId),
        topic: topicService.findByIdForForum(group.forumId, topicId)
      });
    })
    .then(function(result) {
      this.serializedGroup = result.serializedGroup;
      var forum = result.forum;
      var topic = result.topic;

      if(!forum) throw new StatusError(404, 'Forum not found');
      if (!topic) throw new StatusError(404, 'Topic not found.');

      // TODO: how do we know which topics options to pass in to the
      // forum strategy? Maybe it shouldn't include any topics at all?
      var forumStrategy = restSerializer.ForumStrategy.nested({
        currentUserId: userId,
        topicsFilterSort: null
      });

      var TopicStrategy = restSerializer.TopicStrategy.nested({
        currentUserId: userId
      });

      return Promise.props({
        serializedForum: restSerializer.serializeObject(forum, forumStrategy),
        serializedTopic: restSerializer.serializeObject(topic, TopicStrategy)
      });
    })
    .then(function(result) {


      var sortName = req.query.sort;

      this.serializedForum = result.serializedForum;
      this.serializedTopic = result.serializedTopic;

      var context = this.context;
      var group = this.serializedGroup;
      var forum = this.serializedForum;
      var topic = this.serializedTopic;

      var topicStore = forumTopicsStore([topic]);

      return res.render('topics/topic', {
        layout: 'topics-layout',
        hasDarkTheme: this.profileMenuSnapshot.hasDarkTheme,
        hasCachedFonts: fonts.hasCachedFonts(req.cookies),
        fonts: fonts.getFonts(),
        componentData: {
          forum: this.forum,
          context: context,
          groupUri: req.params.groupUri,
          topicsStore: topicStore,
          topicId: topicId,
          sortName: sortName,

          groupStore: groupStore(group),
          forumStore: forumStore(forum),
          accessTokenStore: accessTokenStore(context.accessToken),
          currentUserStore: currentUserStore(context.user),
          repliesStore: repliesStore(topic.replies, sortName),
          categoryStore: forumCategoryStore(forum.categories),
          tagStore: forumTagStore(forum.tags),
          commentsStore: commentsStore([]),
          newCommentStore: newCommentStore(),
          newReplyStore: newReplyStore(),
        }
      });
    })
    .catch(next);
}

module.exports = {
  renderForum: renderForum,
  renderTopic: renderTopic,
};
