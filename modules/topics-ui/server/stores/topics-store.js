"use strict";

var _ = require('lodash');
var navConstants = require('../../shared/constants/navigation');
var forumFilterConstants = require('../../shared/constants/forum-filters');

module.exports = function topicsStore(models, category, tag, filter, user) {

  //Defaults
  models = (models || []);
  category = (category || navConstants.DEFAULT_CATEGORY_NAME);
  tag = (tag || navConstants.DEFAULT_TAG_NAME);
  filter = (filter || navConstants.DEFAULT_FILTER_NAME)
  user = (user || {});

  //Transform the server side models
  models = models.map((model) => {
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
