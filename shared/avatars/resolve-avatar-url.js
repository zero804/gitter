'use strict';
var targetEnv = require('targetenv');
var BASE = 'https://avatars';
var GITHUB_URL = '.githubusercontent.com/';

function hash(str) {
  var buckets = 6; // defaults to 5 buckets

  if (!str || !str.length) return 1;
  var f = 0;
  for(var i = 0; i < str.length; i++) {
    f += str.charCodeAt(i);
  }

  return f % buckets;
}

function build(spec) {
  if (!spec || !spec.username) {
    /* Best we can do */
    return "https://avatars1.githubusercontent.com/u/0";
  }

  var version = spec.version || 3;
  var username = spec.username;
  var size = spec.size || 30;

  return BASE + hash(username) + GITHUB_URL + username + '?v=' + version + '&s=' + size;
}

function getPixelDensity() {
  if (targetEnv.isBrowser) {
    return window.devicePixelRatio || 1;
  }
  return 1;
}

// TODO: needs improvement.
function preload(url) {
  var img;
  if (targetEnv.isBrowser) {
    img = document.createElement('img');
    img.src = url;
  }
}

// make sure to pass the size for non-retina screens
module.exports = function (spec) {
  var pixelDensity = getPixelDensity();
  spec.size = (spec.size || 30) * pixelDensity;
  var url = build(spec);

  if (pixelDensity > 1) {
    preload(url);
  }

  return url;
};
