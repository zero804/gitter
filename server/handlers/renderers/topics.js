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
var newTopicStore = require('gitter-web-topics-ui/server/stores/new-topic-store');
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

  //No switch, no business
  if (!req.fflip || !req.fflip.has('topics')) {
    return next(new StatusError(404));
  }

  //Have to be logged in to get here
  if(!req.user) {
    return next(new StatusError(404));
  }

  var userId = req.user && req.user._id;

  options = (options || {});
  var groupUri = req.params.groupName;

  return contextGenerator.generateNonChatContext(req)
    .then(function(context){

      //context.accessToken
      return groupService.findByUri(groupUri)
        .then(function(group){

          if (!group) { return next(new StatusError(404, 'Group not found.')); }
          if (!group.forumId) { return next(new StatusError(404, 'Forum not found.')); }

          return forumService.findById(group.forumId);
        })
      .then(function(forum){

        if(!forum) { return next(new StatusError(404, 'Forum not found')); }

        var strategy = restSerializer.ForumStrategy.nested({
          currentUserId: userId,
          topicsFilterSort: getTopicsFilterSortOptions(req.query)
        });

        return restSerializer.serializeObject(forum, strategy);
      })
      .then(function(forum){
        var categoryName = (req.params.categoryName || navConstants.DEFAULT_CATEGORY_NAME);
        var filterName = (req.query.filter || navConstants.DEFAULT_FILTER_NAME);
        var tagName = (req.query.tag || navConstants.DEFAULT_TAG_NAME);
        var sortName = (req.query.sort || navConstants.DEFAULT_SORT_NAME);
        var createTopic = (options.createTopic || false);

        return res.render('topics/forum', {
          layout: 'topics-layout',
          hasCachedFonts: fonts.hasCachedFonts(req.cookies),
          fonts: fonts.getFonts(),
          componentData: {
            forum: forum,
            context: context,

            groupName: req.params.groupName,
            categoryName: categoryName,
            filterName: filterName,
            tagName: tagName,
            sortName: sortName,

            createTopic: createTopic,

            categoryStore: forumCategoryStore(forum.categories, categoryName),
            tagStore: forumTagStore(forum.tags, tagName),
            topicsStore: forumTopicsStore(forum.topics, categoryName, tagName, filterName, sortName, context.user),
            newTopicStore: newTopicStore(),
            forumStore: forumStore(forum),
            accessTokenStore: accessTokenStore(context.accessToken),
            currentUserStore: currentUserStore(context.user),
          }
        });
      })
    })

}


function renderTopic(req, res, next) {

  if (!req.fflip || !req.fflip.has('topics')) {
    return next(new StatusError(404));
  }

  var groupUri = req.params.groupName;
  var topicId = req.params.topicId;
  var userId = req.user && req.user._id;

  return contextGenerator.generateNonChatContext(req)
    .then(function(context){
      return groupService.findByUri(groupUri)
        .then(function(group){

          if (!group) { return next(new StatusError(404, 'Group not found.')); }
          if (!group.forumId) { return next(new StatusError(404, 'Forum not found.')); }

          return forumService.findById(group.forumId)
            .then(function(forum){
              if(!forum) { return next(new StatusError(404, 'Forum not found')); }
              // TODO: how do we know which topics options to pass in to the
              // forum strategy? Maybe it shouldn't include any topics at all?

              var strategy = restSerializer.ForumStrategy.nested({
                currentUserId: userId,
                topicsFilterSort: null
              });

              return restSerializer.serializeObject(forum, strategy);
            })
          .then(function(forum){
            return topicService.findByIdForForum(group.forumId, topicId)
              .then(function(topic){

                if (!topic) { return next(new StatusError(404, 'Topic not found.')); }

                var strategy = restSerializer.TopicStrategy.nested({
                  currentUserId: userId
                });

                return restSerializer.serializeObject(topic, strategy);
              })
            .then(function(topic){
              var topicStore = forumTopicsStore([topic]);
              return res.render('topics/topic', {
                layout: 'topics-layout',
                hasCachedFonts: fonts.hasCachedFonts(req.cookies),
                fonts: fonts.getFonts(),
                componentData: {
                  forum: forum,
                  context: context,
                  groupName: req.params.groupName,
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

          });
        })
    });

    //TODO Catch some errors

}

module.exports = {
  renderForum: renderForum,
  renderTopic: renderTopic,
};
