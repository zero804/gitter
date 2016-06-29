'use strict';

function isPublic(object) {
  return object.sd.public;
}

function getLinkPathIfType(type, object) {
  if (object.sd.type !== type) {
    return;
  }

  return object.sd.linkPath;
}

module.exports = {
  isPublic: isPublic,
  getLinkPathIfType: getLinkPathIfType
};
