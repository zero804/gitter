'use strict';

var getRoomNameFromTroupeName = require('./get-room-name-from-troupe-name');

module.exports = function getOrgStateNameFromTroupeName(name) {
  return getRoomNameFromTroupeName(name);
};
