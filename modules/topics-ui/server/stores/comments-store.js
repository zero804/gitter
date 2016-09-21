"use strict";

module.exports = function commentsStore(models) {

  //Defaults
  models = (models || []);

  //Transform the server side models
  models = models.map((model) => {
    return model;
  });

  //Get resource
  const getComments = () => models;

  //Methods
  return {
    models: models,
    getComments: getComments
  };

};
