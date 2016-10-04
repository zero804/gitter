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

  /*
   *  Sorting
   *  This login should be replaced within the serives used to gather this data
   *  as with the topics-store we should always asume the correct sample is passed to this module
   *  and this is only used to parse the data into an acceptable format
   *
   *  This sorting logic is also duplicated in broswer/stores/splies-store
   *  in the collection comparator
   * */
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
