"use strict";

module.exports = function groupStore(data) {

  //Methods
  return {
    data: data,
    get: (key) => data[key],
    getGroup: () => {
      return data;
    },
    getGroupId: () => {
      return data.id;
    },
    getGroupUri: () => {
      return data.uri;
    },
    getGroupName: () => {
      return data.name;
    },
    getGroupAvatarUrl: () => {
      return data.avatarUrl;
    }
  };
};
