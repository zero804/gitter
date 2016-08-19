"use strict";

var StatusError = require('statuserror');
var fonts = require('../../web/fonts');


var groupService = require('gitter-web-groups');
var forumService = require('gitter-web-topics/lib/forum-service');

var topicService = require('gitter-web-forums').topicService;

var forumCategoryStore = require('gitter-web-topics-ui/server/stores/forum-category-store');
var forumTagStore = require('gitter-web-topics-ui/server/stores/forum-tag-store');
var forumTopicsStore = require('gitter-web-topics-ui/server/stores/topics-store');
var newTopicStore = require('gitter-web-topics-ui/server/stores/new-topic-store');
var forumStore = require('gitter-web-topics-ui/server/stores/forum-store');

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

  options = (options || {});
  var groupUri = req.params.groupName;

  return contextGenerator.generateNonChatContext(req)
    .then(function(context){
      //context.accessToken
      return groupService.findByUri(groupUri)
        .then(function(group){
          return forumService.findById(group.forumId);
        })
        .then(function(forum){
          var strategy = new restSerializer.ForumStrategy();
          return restSerializer.serializeObject(forum, strategy);
        })
        .then(function(forum){
          var categoryName = (req.params.categoryName || navConstants.DEFAULT_CATEGORY_NAME);
          var filterName = (req.query.filter || navConstants.DEFAULT_FILTER_NAME);
          var tagName = (req.query.tag || navConstants.DEFAULT_TAG_NAME);
          var sortName = (req.query.sort || navConstants.DEFAULT_SORT_NAME);

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

              createTopic: options.createTopic,

              categoryStore: forumCategoryStore(forum.categories, categoryName),
              tagStore: forumTagStore(forum.tags, tagName),
              topicsStore: forumTopicsStore(forum.topics),
              newTopicStore: newTopicStore(),
              forumStore: forumStore(forum),
            }
          });
        })


    })

}


function renderTopic(req, res, next) {

  if (!req.fflip || !req.fflip.has('topics')) {
    return next(new StatusError(404));
  }

  topicService.getAllTopics()
    .then(function(topics){

      //TODO Remove this, its only for fake data
      var topicId = topics[0].id += '';
      //var topicId = req.params.topicId;

      var topicStore = forumTopicsStore(topics);

      res.render('topics/topic', {
        layout: 'topics-layout',
        hasCachedFonts: fonts.hasCachedFonts(req.cookies),
        fonts: fonts.getFonts(),
        componentData: {
          groupName: req.params.groupName,
          topicsStore: topicStore,
          topicId: topicId,
        }
      });
    });
}

module.exports = {
  renderForum: renderForum,
  renderTopic: renderTopic,
};
