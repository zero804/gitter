"use strict";

var StatusError = require('statuserror');
var fonts = require('../../web/fonts');


var groupService = require('gitter-web-groups');
var forumService = require('gitter-web-topics/lib/forum-service');
var topicService = require('gitter-web-topics/lib/topic-service');


var forumCategoryStore = require('gitter-web-topics-ui/server/stores/forum-category-store');
var forumTagStore = require('gitter-web-topics-ui/server/stores/forum-tag-store');
var forumTopicsStore = require('gitter-web-topics-ui/server/stores/topics-store');
var newTopicStore = require('gitter-web-topics-ui/server/stores/new-topic-store');
var forumStore = require('gitter-web-topics-ui/server/stores/forum-store');
var accessTokenStore = require('gitter-web-topics-ui/server/stores/access-token-store');
var repliesStore = require('gitter-web-topics-ui/server/stores/replies-store');
var currentUserStore = require('gitter-web-topics-ui/server/stores/current-user-store');

var navConstants = require('gitter-web-topics-ui/shared/constants/navigation');

var restSerializer = require('../../serializers/rest-serializer');
var contextGenerator = require('../../web/context-generator.js');


function renderForum(req, res, next, options) {

  //No switch, no business
  if (!req.fflip || !req.fflip.has('topics')) {return next(new StatusError(404));}

  //Have to be logged in to get here
  if(!req.user) {return next(new StatusError(404));}

  options = (options || {});
  var groupUri = req.params.groupName;

  return contextGenerator.generateNonChatContext(req).bind({})
  .then(function(context){
    this.context = context;
    return groupService.findByUri(groupUri)
  })
  .then(function(group){
    //No group no render
    if (!group) { return next(new StatusError(404, 'Group not found.')); }
    if (!group.forumId) { return next(new StatusError(404, 'Forum not found.')); }
    return forumService.findById(group.forumId);
  })
  .then(function(forum){
    //No forum no render
    if(!forum) { return next(new StatusError(404, 'Forum not found')); }
    var strategy = new restSerializer.ForumStrategy();
    return restSerializer.serializeObject(forum, strategy);
  })
  .then(function(forum){

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

        groupName: req.params.groupName,
        categoryName: categoryName,
        filterName: filterName,
        tagName: tagName,
        sortName: sortName,

        createTopic: createTopic,

        categoryStore: forumCategoryStore(forum.categories, categoryName),
        tagStore: forumTagStore(forum.tags, tagName),
        topicsStore: forumTopicsStore(forum.topics),
        newTopicStore: newTopicStore(),
        forumStore: forumStore(forum),
        accessTokenStore: accessTokenStore(context.accessToken),
        currentUserStore: currentUserStore(context.user),
      }
    })
  });
}


function renderTopic(req, res, next) {

  //No switch, no business
  if (!req.fflip || !req.fflip.has('topics')) {return next(new StatusError(404));}

  //Have to be logged in to get here
  if(!req.user) {return next(new StatusError(404));}

  var groupUri = req.params.groupName;
  var topicId = req.params.topicId;

  return contextGenerator.generateNonChatContext(req).bind({})
  .then(function(context){
    this.context = context;
    return groupService.findByUri(groupUri)
  })
  .then(function(group){
    //No group no render
    if (!group) { return next(new StatusError(404, 'Group not found.')); }
    if (!group.forumId) { return next(new StatusError(404, 'Forum not found.')); }
    this.group = group;
    return forumService.findById(group.forumId)
  })
  .then(function(forum){
    //No forum no render
    if(!forum) { return next(new StatusError(404, 'Forum not found')); }
    var strategy = new restSerializer.ForumStrategy();
    return restSerializer.serializeObject(forum, strategy);
  })
  .then(function(forum){
    var group = (this.group || {});
    this.forum = forum;
    return topicService.findByIdForForum(group.forumId, topicId)
  })
  .then(function(topic){
    //No topic no render
    if (!topic) { return next(new StatusError(404, 'Topic not found.')); }
    var strategy = new restSerializer.TopicStrategy({
      includeReplies: true,
      includeRepliesTotals: true,
      // TODO: we'll probably include a sample of comments on those replies
      // down the line.
    });
    return restSerializer.serializeObject(topic, strategy);
  })
  .then(function(topic){
    var context = this.context;
    var forum = this.forum;
    var topicStore = forumTopicsStore([topic]);
    return res.render('topics/topic', {
      layout: 'topics-layout',
      hasCachedFonts: fonts.hasCachedFonts(req.cookies),
      fonts: fonts.getFonts(),
      componentData: {
        forum: forum,
        groupName: req.params.groupName,
        topicsStore: topicStore,
        topicId: topicId,
        accessTokenStore: accessTokenStore(context.accessToken),
        currentUserStore: currentUserStore(context.user),
        repliesStore: repliesStore(topic.replies),
        categoryStore: forumCategoryStore([topic.category]),
        forumStore: forumStore(forum),
      }
    });
  });
}

module.exports = {
  renderForum: renderForum,
  renderTopic: renderTopic,
};
