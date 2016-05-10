'use strict';

var getRoomNameFromTroupeName = require('gitter-web-shared/get-room-name-from-troupe-name');

module.exports = function getOrgStateNameFromTroupeName(name) {
  return getRoomNameFromTroupeName(name);
};
