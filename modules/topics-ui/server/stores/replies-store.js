"use strict";
var parseReply = require('../../shared/parse/reply');
var forumConstants = require('../../shared/constants/forum.js');

module.exports = function repliesStore(models) {

  //Defaults
  models = (models || []);

  //Transform the server side models
  models = models.map(function(model) {
    model.subscriptionState = model.subscribed ? forumConstants.SUBSCRIPTION_STATE.SUBSCRIBED : forumConstants.SUBSCRIPTION_STATE.UNSUBSCRIBED
    delete model.subscribed;

    return parseReply(model);
  });

  //Get resource
  const getReplies = () => models;

  //Methods
  return {
    data: models,
    getReplies: getReplies
  };

};
