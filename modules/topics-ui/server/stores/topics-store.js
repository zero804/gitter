/* eslint complexity: ["error", 14] */
"use strict";

var _ = require('lodash');
var navConstants = require('../../shared/constants/navigation');
var forumFilterConstants = require('../../shared/constants/forum-filters');
var forumSortConstants = require('../../shared/constants/forum-sorts');
var forumConstants = require('../../shared/constants/forum.js');

module.exports = function topicsStore(models, category, tag, filter, sort, user) {

  //Defaults
  models = (models || []);
  category = (category || navConstants.DEFAULT_CATEGORY_NAME);
  tag = (tag || navConstants.DEFAULT_TAG_NAME);
  filter = (filter || navConstants.DEFAULT_FILTER_NAME)
  sort = (sort || forumSortConstants.MOST_RECENT_SORT)
  user = (user || {});

  //Transform the server side models
  models = models.map((model) => {
    model.subscriptionState = model.subscribed ? forumConstants.SUBSCRIPTION_STATE.SUBSCRIBED : forumConstants.SUBSCRIPTION_STATE.UNSUBSCRIBED
    delete model.subscribed;

    return model;
  });

  //Filter based on the currently selected category
  if(category !== navConstants.DEFAULT_CATEGORY_NAME) {
    models = models.filter((m) => m.category.slug === category);
  }

  if(tag !== navConstants.DEFAULT_TAG_NAME) {
    //Could this be more efficient? /cc @supreememoocow
    models = models.filter((m) => m.tags.some((t) => t === tag));
  }

  if(filter !== navConstants.DEFAULT_FILTER_NAME) {
    //Filter by my topics
    if(filter === forumFilterConstants.FILTER_BY_TOPIC) {
      models = models.filter((m) => m.user.username === user.username);
    }
    //TODO ...
  }

  if(sort === forumSortConstants.MOST_RECENT_SORT) {
    models.sort((a, b) => new Date(b.sent) - new Date(a.sent));
  }

  if(sort === forumSortConstants.MOST_WATCHERS_SORT) {
    models.sort((a, b) => (a.replyingUsers.length > b.replyingUsers.length ? -1 : 1));
  }


  //Get resource
  const getTopics = () => models;
  const getById = function(id){
    var model = _.find(models, (model) => model.id === id);
    if(!model) { return; }
    return model;
  }
  //Methods
  return {
    data: models,
    getTopics: getTopics,
    getById: getById
  };

};
