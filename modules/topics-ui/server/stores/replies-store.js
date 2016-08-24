"use strict";

module.exports = function repliesStore(models) {

  //Defaults
  models = (models || []);

  //Transform the server side models
  models = models.map((model) => {
    return model;
  });

  //Get resource
  const getReplies = () => models;

  //Methods
  return {
    models: models,
    getReplies: getReplies
  };

};
