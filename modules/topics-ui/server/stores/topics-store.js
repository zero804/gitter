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
  const getById = (id) => models.reduce((memo, cur) => {
    if(cur.id === id) { return cur };
    return memo;
  }, false);

  //Methods
  return {
    models: models,
    getTopics: getTopics,
    getById: getById
  };

};
