"use strict";

module.exports = function accessTokenStore(token) {

  const getAccessToken = () => token

  //Methods
  return {
    token: token,
    getAccessToken: getAccessToken
  };
};
