"use strict";

module.exports = function forumStore(data) {

  //Defaults
  data = (data || {});

  //Get data
  const get = (key) => data[key];

  const getForum = () => data;
  const getForumId = () => data.id

  //Methods
  return {
    get: get,
    data: data,
    getForum: getForum,
    getForumId: getForumId,
  };
};
