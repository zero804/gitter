"use strict";

module.exports = function currentUserStore(data) {

  //Defaults
  data = (data || {});

  //Get data
  const get = (key) => data[key];

  //Methods
  return {
    get: get,
    data: data
  };
};
