'use strict';

var resolveAvatarSrcSet = require('./resolve-avatar-srcset');

// make sure to pass the size for non-retina screens
module.exports = function (spec) {
  var srcSet = resolveAvatarSrcSet(spec);
  return srcSet.src;
};
