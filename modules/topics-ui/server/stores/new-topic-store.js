"use strict";

module.exports = function newTopicStore(data) {

  //Defaults
  data = (data || {});

  //Get data
  const get = (key) => data[key];

  //Methods
  return {
    get: get
  };
};
