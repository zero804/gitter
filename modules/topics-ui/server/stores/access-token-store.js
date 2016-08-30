"use strict";

module.exports = function accessTokenStore(token) {

  //Get data
  const get = () => token;

  //Methods
  return {
    get: get,
    token: token
  };
};
