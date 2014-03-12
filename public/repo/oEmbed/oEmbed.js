(function (root, factory) {
  if (typeof exports === "object" && exports) {
    factory(exports); // CommonJS
  } else {
    var oEmbed = {};
    //factory(oEmbed);
    if (typeof define === "function" && define.amd) {
      define(['jquery-iframely'], factory); // AMD
    } else {
      root.oEmbed = factory(jQuery); // <script>
    }
  }
}(this, function ($) {
  var oEmbed    = {};
  var oEmbedProviders = {};
  var iframelyProviders = [];
  var lookups   = [];
  var defaults  = {};
  $.iframely.defaults.endpoint = 'http://localhost:8061/iframely';

  function addOEmbedProvider(name, patterns, endpoint, opts) {
    oEmbedProviders[name] = {
      patterns:   patterns,
      endpoint:   endpoint,
      opts:       opts
    };

    for (var i = 0; i < patterns.length; i++) {
      lookups.push({name: name, re: new RegExp(patterns[i])});
    }
  }

  function something(url, cb) {
    $.iframely.getPageData(url, function(error, data) {
      if(error) return cb(null);

      renderBestContent(data, cb);
    });
  }

  function what(link) {
    var supportedRels = ['image', 'player', 'thumbnail', 'app'];
    return supportedRels.some(function(supportedRel) {
      return link.rel.indexOf(supportedRel) > -1;
    });
  }

  function renderBestContent(iframelyData, cb) {
    var match;
    iframelyData.links.forEach(function(link) {
      if(!match && what(link)) {
        match = link;
      }
    });

    if(!match) return cb(null);

    var $el = $.iframely.generateLinkElement(match, iframelyData);
    cb({html: $el[0].outerHTML});
  }

  function fetch(provider, url, cb) {
    var data = {
      url:    url,
      format: 'json'
    };

    if (defaults) {
      for (var key in defaults) {
        data[key] = defaults[key];
      }
    }

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
      error:        function(err)  { cb(null); }
    });
  }

  function parse(url, cb) {
    var providerName = supported(url);
    var imageUrl     = url.match(/https?:\/\/([\w-:\.\/%]+)(\.jpe?g|\.gif|\.png)/i);

    if (iframelySupported(url)) {
      something(url, cb);
    } else if(providerName) {
      fetch(oEmbedProviders[providerName], url, cb);
    } else if (imageUrl) {
      var imgTag = '<img src="' + imageUrl[0] + '" width="' + defaults.maxwidth + '">';
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

  // NoEmbed fallbacks (http://noembed.com/)
  iframelyProviders.push(new RegExp("wikipedia.org/wiki/"));
  iframelyProviders.push(new RegExp("youtube.com/watch"));
  iframelyProviders.push(new RegExp("instagr.?am(.com)?/p/"));
  iframelyProviders.push(new RegExp("gist.github.com/.+/.+"));
  iframelyProviders.push(new RegExp("cloudup.com"));
  iframelyProviders.push(new RegExp("cl.ly"));
  iframelyProviders.push(new RegExp("dl.dropboxusercontent.com"));

  // FIXME Wrong embed size, overflows
  //addProvider("vine",       ["vine.co/v/"],                                     "//noembed.com/embed");
  //addProvider("ted",        ["ted.com/talks/"],                                 "//noembed.com/embed");

  oEmbed.parse = parse;

  return oEmbed;

}));
