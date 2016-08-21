"use strict";

module.exports = function topicsStore(models) {

  //Defaults
  models = (models || []);

  //Transform the server side models
  models = models.map((model) => {
    return model;
  });

  //Get resource
  const getTopics = () => models;

  //Methods
  return {
    models: models,
    getTopics: getTopics
  };

};
