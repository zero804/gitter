'use strict';

var targetEnv   = require('targetenv');
var BASE_URL = "https://avatars1.githubusercontent.com/";
var DEFAULT_URL = BASE_URL + "u/0";

/* URL may or may not have a leading slash */
function build(url, size) {
  if (!url) {
    /* Best we can do */
    return DEFAULT_URL;
  }

  var leadingSlash = url[0] === '/';
  var base = url.split('/')[leadingSlash ? 1 : 0];
  if (!base) return DEFAULT_URL;

  return BASE_URL + base + '?s=' + size;
}

var getPixelDensity = targetEnv.isBrowser ?
  function() { return window.devicePixelRatio || 1; } :
  function() { return 1; };

// make sure to pass the size for non-retina screens
module.exports = function (url, size) {
  var pixelDensity = getPixelDensity();
  size = (size || 60) * pixelDensity;
  return build(url, size);
};
