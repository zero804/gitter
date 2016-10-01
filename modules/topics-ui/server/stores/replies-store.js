"use strict";

var _ = require('lodash');
var parseReply = require('../../shared/parse/reply');
var topicConstants = require('../../shared/constants/topic');

module.exports = function repliesStore(models, sortName) {

  //Defaults
  models = (models || []);

  //Transform the server side models
  models = models.map(function(model) {
    return parseReply(model);
  });

  //Get resource
  const getReplies = () => models;
  const getById = function(id) {
    var model = _.find(models, (model) => model.id === id);
    if(!model) { return; }
    return model;
  };

  if(sortName === topicConstants.TOPIC_REPLIES_COMMENT_SORT_NAME) {
    models.sort((a, b) => b.commentsTotal - a.commentsTotal);
  }

  if (sortName === topicConstants.TOPIC_REPLIES_LIKED_SORT_NAME) {
    models.sort((a, b) => {
      const aCount = ((a.reactions || {}).like || 0);
      const bCount = ((b.reactions || {}).like || 0);
      return bCount - aCount;
    });
  }

  if (sortName === topicConstants.TOPIC_REPLIES_RECENT_SORT_NAME) {
    models.sort((a, b) => new Date(b.sent) - new Date(a.sent));
  }

  //Methods
  return {
    data: models,
    getById: getById,
    getReplies: getReplies
  };

};
