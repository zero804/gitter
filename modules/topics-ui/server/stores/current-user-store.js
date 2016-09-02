"use strict";

module.exports = function currentUserStore(data) {

  //Defaults
  data = (data || {});

  //Get data
  const get = (key) => data[key];
  const getCurrentUser = () => data

  //Methods
  return {
    get: get,
    data: data,
    getCurrentUser: getCurrentUser
  };
};
