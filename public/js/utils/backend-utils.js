'use strict';

function getLinkPathCond(type, object) {
  var backend = (object.get && object.get('backend')) || object.backend;
  if (!backend) return;
  if (backend.type === type) return backend.linkPath;
}

module.exports = {
  getLinkPathCond: getLinkPathCond
};
