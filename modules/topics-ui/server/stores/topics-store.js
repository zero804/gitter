"use strict";

var _ = require('lodash');

module.exports = function topicsStore(models) {

  //Defaults
  models = (models || []);

  //Transform the server side models
  models = models.map((model) => {
    return model;
  });

  //Get resource
  const getTopics = () => models;
  const getById = function(id){
    var model = _.find(models, (model) => model.id === id);
    if(!model) { return; }
    return model;
  }
  //Methods
  return {
    models: models,
    getTopics: getTopics,
    getById: getById
  };

};
