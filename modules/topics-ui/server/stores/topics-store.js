/* eslint complexity: ["error", 14] */
"use strict";

var _ = require('lodash');
var navConstants = require('../../shared/constants/navigation');
var forumFilterConstants = require('../../shared/constants/forum-filters');
var forumSortConstants = require('../../shared/constants/forum-sorts');
var parseTopic = require('../../shared/parse/topic');
var modelStates = require('../../shared/constants/model-states');

module.exports = function topicsStore(models, category, tag, filter, sort, user, isCreatingTopic) {

  //Defaults
  models = (models || []);
  category = (category || navConstants.DEFAULT_CATEGORY_NAME);
  tag = (tag || navConstants.DEFAULT_TAG_NAME);
  filter = (filter || navConstants.DEFAULT_FILTER_NAME)
  sort = (sort || forumSortConstants.MOST_RECENT_SORT)
  user = (user || {});

  //Transform the server side models
  models = models.map((model) => {
    return parseTopic(model);
  });

  //Filter based on the currently selected category
  if(category !== navConstants.DEFAULT_CATEGORY_NAME) {
    models = models.filter((m) => m.category.slug === category);
  }

  if(tag !== navConstants.DEFAULT_TAG_NAME) {
    models = models.filter((m) => m.tags.some((t) => t === tag));
  }

  if(filter !== navConstants.DEFAULT_FILTER_NAME) {
    //Filter by my topics
    if(filter === forumFilterConstants.FILTER_BY_TOPIC) {
      models = models.filter((m) => m.user.username === user.username);
    }
    //TODO ...
  }

  //Sort by most recent
  if(sort === forumSortConstants.MOST_RECENT_SORT) {
    models.sort((a, b) => new Date(b.sent) - new Date(a.sent));
  }

  //Sort by watchers
  if(sort === forumSortConstants.MOST_WATCHERS_SORT) {
    models.sort((a, b) => (a.replyingUsers.length > b.replyingUsers.length ? -1 : 1));
  }

  //Basic draft topic object
  const draftTopic = {
    state: modelStates.MODEL_STATE_DRAFT,
    body: '',
    title: '',
    categoryId: '',
    tags: []
  }

  if (isCreatingTopic) {
    //If we are loading the create topic route we need to
    //bootstrap our collection with a draft model
    models.push(draftTopic)
  }


  //Get resource
  const getTopics = () => models.filter((topic) => topic.state !== modelStates.MODEL_STATE_DRAFT);
  const getById = function(id){
    var model = _.find(models, (model) => model.id === id);
    if(!model) { return; }
    return model;
  }
  //Methods
  return {
    data: models,
    getTopics: getTopics,
    getById: getById,
    getDraftTopic: () => draftTopic
  };

};
