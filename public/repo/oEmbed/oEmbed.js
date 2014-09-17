/* jshint unused:true, browser:true,  strict:true */
/* global define:false */
define(['jquery-iframely', 'utils/context'], function ($, context) {
  "use strict";

  var oEmbedProviders = {};
  var iframelyProviders = [];
  var lookups = [];
  var embedEnv = context.env('embed');
  $.iframely.defaults.endpoint = embedEnv.basepath+'/'+embedEnv.cacheBuster+'/iframely';

  function addOEmbedProvider(name, patterns, endpoint, opts) {
    oEmbedProviders[name] = {
      patterns:   patterns,
      endpoint:   endpoint,
      opts:       opts
    };

    patterns.forEach(function(pattern) {
      lookups.push({name: name, re: new RegExp(pattern)});
    });
  }

  function fetchAndRenderIframely(url, cb) {
    $.iframely.getPageData(url, function(error, data) {
      if(error) return cb(null);

      renderBestContent(data, cb);
    });
  }

  function isIframelyLinkSupported(link) {
    var supportedRels = ['image', 'player', 'thumbnail', 'app'];
    return supportedRels.some(function(supportedRel) {
      return link.rel.indexOf(supportedRel) > -1;
    });
  }

  function canBeLimitedByHeight(link) {
    var shrinkableRels = ['app'];
    return shrinkableRels.some(function(supportedRel) {
      return link.rel.indexOf(supportedRel) > -1;
    });
  }

  function renderBestContent(iframelyData, cb) {
    var match;
    var limitHeight;
    iframelyData.links.forEach(function(link) {
      if(!match && isIframelyLinkSupported(link)) {
        match = link;
        limitHeight = canBeLimitedByHeight(link);
      }
    });

    if(!match) return cb(null);

    var $el = $.iframely.generateLinkElement(match, iframelyData);
    cb({html: $el[0].outerHTML, limitHeight: limitHeight});
  }

  function fetch(provider, url, cb) {
    var data = {
      url:    url,
      format: 'json'
    };

    if (provider.opts) {
      for (var key in provider.opts) {
        data[key] = provider.opts[key];
      }
    }

    $.ajax({
      url:          provider.endpoint,
      dataType:     'jsonp',
      crossDomain:  true,
      data:         data,
      success:      function(data) { cb(data); },
      error:        function() { cb(null); }
    });
  }

  // image decorator
  function parse(url, cb) {
    var providerName = supported(url);
    var imageUrl = url.match(/https?:\/\/([\w-:\.\/%]+)(\.jpe?g|\.gif|\.png)/i);

    if (iframelySupported(url)) {
      fetchAndRenderIframely(url, cb);
    } else if (providerName) {
      fetch(oEmbedProviders[providerName], url, cb);
    } else if (imageUrl) {
      var imgTag = '<img src="' + imageUrl[0] + '">';
      var embed  = {html: imgTag};
      cb(embed);
    } else {
      cb(null);
    }
  }

  function supported(url) {
    for (var i = 0; i < lookups.length; i++) {
      if (url.match(lookups[i].re)) return lookups[i].name;
    }
  }

  function iframelySupported(url) {
    return iframelyProviders.some(function(re) {
      return url.match(re);
    });
  }

  // Native oEmbedProviders
  addOEmbedProvider("spotify",      ["open.spotify.com/(track|album|user)/"],           "//embed.spotify.com/oembed/");
  addOEmbedProvider("rdio.com",     ["rd.io/.+","rdio.com"],                            "//www.rdio.com/api/oembed/");
  addOEmbedProvider("Soundcloud",   ["soundcloud.com/.+","snd.sc/.+"],                  "//soundcloud.com/oembed", {format: 'js', maxheight: 200});
  addOEmbedProvider("twitter",      ["twitter.com/.+"],                                 "//api.twitter.com/1/statuses/oembed.json");
  addOEmbedProvider("meetup",       ["meetup.(com|ps)/.+"],                             "//api.meetup.com/oembed");
  addOEmbedProvider("vimeo",        ["vimeo.com/groups/.*/videos/.*", "vimeo.com/.*"],  "//vimeo.com/api/oembed.json");
  addOEmbedProvider("dailymotion",  ["dailymotion.com/.+"],                             "//www.dailymotion.com/services/oembed");
  addOEmbedProvider("ustream",      ["ustream.tv/recorded/.*"],                         "//www.ustream.tv/oembed");
  addOEmbedProvider("photobucket",  ["photobucket.com/(albums|groups)/.+"],             "//photobucket.com/oembed/");
  addOEmbedProvider("slideshare",   ["slideshare.net"],                                 "//www.slideshare.net/api/oembed/2",{format:'jsonp'});

  iframelyProviders.push(new RegExp("youtube\\.com/watch"));
  iframelyProviders.push(/https?:\/\/youtu\.be\//);
  iframelyProviders.push(new RegExp("instagr\\.?am(\\.com)?/p/"));
  // 15 Sep 2014: disabling gist provider until we can do something better
  // iframelyProviders.push(new RegExp("gist\\.github\\.com/.+/.+"));
  iframelyProviders.push(new RegExp("cloudup\\.com"));
  iframelyProviders.push(new RegExp("cl\\.ly/.+"));
  iframelyProviders.push(new RegExp("dl\\.dropboxusercontent\\.com"));
  iframelyProviders.push(new RegExp("dropbox\\.com/s/.+"));

  return { parse: parse };

});
