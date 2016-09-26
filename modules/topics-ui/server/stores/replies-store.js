"use strict";

var _ = require('lodash');
var parseReply = require('../../shared/parse/reply');


module.exports = function repliesStore(models) {

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

  //Methods
  return {
    data: models,
    getById: getById,
    getReplies: getReplies
  };

};
