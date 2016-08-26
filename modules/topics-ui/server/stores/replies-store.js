"use strict";
var parseReply = require('../../shared/parse/reply');

module.exports = function repliesStore(models) {

  //Defaults
  models = (models || []);

  //Transform the server side models
  models = models.map(parseReply);

  //Get resource
  const getReplies = () => models;

  //Methods
  return {
    models: models,
    getReplies: getReplies
  };

};
