"use strict";

module.exports = function forumStore(data) {

  //Defaults
  data = (data || {});

  //Get data
  const get = (key) => data[key];

  //Methods
  return {
    get: get
  };
};
