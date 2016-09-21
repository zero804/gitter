"use strict";

var forumConstants = require('../../shared/constants/forum.js');

module.exports = function forumStore(data) {

  //Defaults
  data = (data || {});

  // TODO: remove fake data
  data.watchState = forumConstants.FORUM_WATCH_STATE.NOT_WATCHING;

  //Get data
  const get = (key) => data[key];

  //Methods
  return {
    get: get,
    data: data,
    getForum: () => {
      return data;
    },
    getForumId: () => {
      return data.id;
    },
    getWatchState: () => {
      return data.watchState;
    },
  };
};
