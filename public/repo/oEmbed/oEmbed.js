/* jshint unused:true, browser:true,  strict:true */
/* global define:false */
define(['jquery', 'jquery-iframely', 'utils/context'], function ($, $iframe, context) {
  "use strict";

  var iframelyProviders = ["youtube.com",
    "www.youtube.com",
    "youtu.be",
    "instagram.com",
    "instagr.am",
    "instagr.am",
    "cloudup.com",
    "cl.ly",
    "dl.dropboxusercontent.com",
    "dropbox.com/s",
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
    "jsfiddle.net",
    "speakerdeck.com",
    "www.behance.net",
    "dribbble.com",
    "vimeo.com",
    "www.flickr.com",
    "flic.kr",
    "500px.com"
    ].map(function(m) {
      var urlRe = m.replace(/[\.\/]/g, function(f) { return "\\" + f[0]; });
      return new RegExp('https?:\\/\\/' + urlRe + '\\/.+');
    });

  var embedEnv = context.env('embed');
  $.iframely.defaults.endpoint = embedEnv.basepath+'/'+embedEnv.cacheBuster+'/iframely';

  function fetchAndRenderIframely(url, cb) {
    $.iframely.getPageData(url, function(error, data) {
      if(error) return cb(null);

      renderBestContent(data, cb);
    });
  }

  function isIframelyLinkSupported(link) {
    var supportedRels = ['reader', 'image', 'player', 'thumbnail', 'app'];
    return supportedRels.some(function(supportedRel) {
      return link.rel.indexOf(supportedRel) > -1;
    });
  }

  function canBeLimitedByHeight(link) {
    var shrinkableRels = ['app', 'reader', 'player'];
    return shrinkableRels.some(function(supportedRel) {
      return link.rel.indexOf(supportedRel) > -1;
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

  function findBestLink(links) {
    var primaryRelTypes = ['player', 'app', 'reader', 'survey', 'image', 'thumbnail'];
    for(var i = 0; i < primaryRelTypes.length; i++) {
      var l = findBestType(primaryRelTypes[i], links);
      if (l) return l;
    }
  }


  function renderBestContent(iframelyData, cb) {
    var match;
    var limitHeight;

    var match = findBestLink(iframelyData.links);

    if(!match) return cb(null);

    var $el = $.iframely.generateLinkElement(match, iframelyData);
    cb({html: $el, limitHeight: limitHeight});
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

  return { parse: parse };

});
