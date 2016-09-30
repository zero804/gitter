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
    }
  };
};
