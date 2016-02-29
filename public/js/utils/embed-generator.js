/* jshint unused:true, browser:true, node:true */
'use strict';

var $ = require('jquery');
require('jquery-iframely');
var context = require('utils/context');

var iframelyProviders = ["youtube.com",
  "www.youtube.com",
  "youtu.be",
  "instagram.com",
  "instagr.am",
  "cloudup.com",
  "cl.ly",
  "dl.dropboxusercontent.com",
  "www.dropbox.com/s",
  "codepen.io",
  "gist.github.com",
  "vine.co",
  "goo.gl",
  "twitter.com",
  "soundcloud.com",
  "snd.sc",
  "rd.io",
  "rdio.com",
  "www.mixcloud.com",
  "www.meetup.com",
  "www.dailymotion.com",
  "meetu.ps",
  "open.spotify.com",
  "stream.tv/recorded",
  "photobucket.com",
  "www.slideshare.net",
  "speakerdeck.com",
  "www.behance.net",
  "dribbble.com",
  "vimeo.com",
  "www.flickr.com",
  "www.twitch.tv",
  "flic.kr",
  "500px.com" /*,
  /https?:\/\/www.google\.\w{2,3}(\.\w{2,3})?\/maps/ */
  ].map(function(m) {
    if (typeof m === 'object') return m;
    var urlRe = m.replace(/[\.\/]/g, function(f) { return "\\" + f[0]; });
    return new RegExp('https?:\\/\\/' + urlRe + '\\/.+');
  });

var MAX_HEIGHT = 640;

var embedEnv = context.env('embed');
$.iframely.defaults.endpoint = embedEnv.basepath+'/'+embedEnv.cacheBuster+'/iframely';

function fetchAndRenderIframely(url, cb) {
  $.iframely.getPageData(url, { lazy: 1, autoplay: false, ssl: true, iframe: true, html5: true }, function(error, data) {
    if(error) return cb(null);

    renderBestContent(data, cb);
  });
}

function findBestType(type, links) {
  var filtered = links.filter(function(f) { return f.rel.indexOf(type) >= 0; });
  if (!filtered.length) return;
  if (filtered.length == 1) return filtered[0];
  var responsive = filtered.filter(function(f) { return f.rel.indexOf('responsive') >= 0; });

  if (responsive.length >= 1) return responsive[0];

  var hasAspect = filtered.filter(function(f) { return f.media && f.media['aspect-ratio'] > 0; });
  if (hasAspect.length >= 1) return hasAspect[0];

  return filtered[0];
}


function findBestImageType(type, links) {
  var filtered = links.filter(function(f) { return f.rel.indexOf(type) >= 0; });
  if (!filtered.length) return;

  /* Get closest size to 640 height */
  filtered.sort(function(a, b) {
    var aH = Math.abs((a.media && a.media.height || 0) - MAX_HEIGHT);
    var bH = Math.abs((b.media && b.media.height || 0) - MAX_HEIGHT);

    return aH - bH;
  });

  return filtered[0];
}

function findBestLink(links) {
  var primaryRelTypes = ['player', 'app', 'reader', 'survey'];
  for(var i = 0; i < primaryRelTypes.length; i++) {
    var l = findBestType(primaryRelTypes[i], links);
    if (l) return l;
  }

  var image = findBestImageType('image', links);
  if (image) return image;

  image = findBestImageType('thumbnail', links);
  if (image) return image;
}


function renderBestContent(iframelyData, cb) {
  var match = findBestLink(iframelyData.links);

  if(!match) return cb(null);

  var $el = $.iframely.generateLinkElement(match, iframelyData);
  var aspectRatio = match.media && match.media['aspect-ratio'];
  var maxWidth = aspectRatio && Math.floor(aspectRatio * MAX_HEIGHT);
  cb({ html: $el, maxWidth: maxWidth });
}

// image decorator
function parse(url, cb) {
  var imageUrl = url.match(/https?:\/\/(.+)(\.jpe?g|\.gif|\.png)$/i);

  if (iframelySupported(url) || imageUrl) {
    fetchAndRenderIframely(url, cb);
  } else {
    cb(null);
  }
}

function iframelySupported(url) {
  return iframelyProviders.some(function(re) {
    return url.match(re);
  });
}

module.exports ={ parse: parse };
