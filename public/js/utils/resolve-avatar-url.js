'use strict';
var BASE = 'https://avatars';
var GITHUB_URL = '.githubusercontent.com/';

function isClient() {
  return typeof window !== 'undefined' ? true : false;
}

function hash(spec) {
  var str = spec.str || '';
  var buckets = spec.buckets || 6; // defaults to 5 buckets
  if (!str) return str;

  return str
    .trim()
    .split('')
    .reduce(function (fold, c) {
      fold += c.charCodeAt();
      return fold;
    }, 0) % buckets; // the number of buckets from 0 to (buckets - 1)
}

function build(spec) {
  spec = spec || {};
  var version = spec.version || 3;
  var username = spec.username || 'default';
  var size = spec.size || 30;

  return BASE + hash({ str: username }) + GITHUB_URL + username + '?v=' + version + '&s=' + size;
}

function getPixelDensity() {
  if (isClient()) {
    return window.devicePixelRatio || 1;
  }
  return 1;
}

// TODO: needs improvement.
function preload(url) {
  var img;
  if (isClient()) {
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
