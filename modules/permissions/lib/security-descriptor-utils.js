'use strict';

var assert = require('assert');

function isPublic(object) {
  // Note, this should deliberately crash when
  // object.sd is undefined
  return object.sd.public;
}

function getLinkPathIfType(type, object) {
  // Note, this should deliberately crash when
  // object.sd is undefined
  if (object.sd.type !== type) {
    return;
  }

  return object.sd.linkPath;
}

function isType(type, object) {
  // Note, this should deliberately crash when
  // object.sd is undefined
  assert(type === null || type === 'GH_ORG' || type === 'GH_REPO' || type === 'GH_USER');

  return object.sd.type === type;
}

module.exports = {
  isPublic: isPublic,
  isType: isType,
  getLinkPathIfType: getLinkPathIfType
};
