"use strict";

var _ = require('lodash');
var forumConstants = require('../../shared/constants/forum.js');

module.exports = function forumStore(initialData) {
  initialData = (initialData || {});

  var data = _.extend({}, initialData, {
    subscriptionState: initialData.subscribed ? forumConstants.SUBSCRIPTION_STATE.SUBSCRIBED : forumConstants.SUBSCRIPTION_STATE.UNSUBSCRIBED
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
    getSubscriptionState: () => {
      return data.subscriptionState;
    },
  };
};
