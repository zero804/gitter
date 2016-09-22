"use strict";

var _ = require('lodash');
var forumConstants = require('../../shared/constants/forum.js');

module.exports = function forumStore(initialData) {
  initialData = (initialData || {});

  var data = _.extend({}, initialData, {
    watchState: initialData.subscribed ? forumConstants.FORUM_WATCH_STATE.WATCHING : forumConstants.FORUM_WATCH_STATE.NOT_WATCHING
  });
  delete data.subscribed;


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
