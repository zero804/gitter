(function (root, factory) {
  if (typeof exports === "object" && exports) {
    factory(exports); // CommonJS
  } else {
    var oEmbed = {};
    //factory(oEmbed);
    if (typeof define === "function" && define.amd) {
      define(['jquery'], factory); // AMD
    } else {
      root.oEmbed = factory(jQuery); // <script>
    }
  }
}(this, function ($) {
  var oEmbed    = {}
  var providers = {};
  var lookups   = [];
  var defaults  = {};

  function addProvider(name, patterns, endpoint, opts) {
    providers[name] = {
      patterns:   patterns,
      endpoint:   endpoint,
      opts:       opts
    };

    for (var i = 0; i < patterns.length; i++) {
      lookups.push({name: name, re: new RegExp(patterns[i])});
    }
  }

  function fetch(provider, url, cb) {
    var data = {
      url:    url,
      format: 'json'
    };

    if (oEmbed.defaults) {
      for (var key in oEmbed.defaults) {
        data[key] = oEmbed.defaults[key];
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
    var imageUrl     = url.match(/https?:\/\/([\w-:\.\/]+)(\.jpe?g|\.gif|\.png)/i);

    if (providerName) {
      fetch(providers[providerName], url, cb);
    } else if (imageUrl) {
      var imgTag = '<img src="' + imageUrl[0] + '" width="' + oEmbed.defaults.maxwidth + '">';
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

  // Native providers
  addProvider("spotify",      ["open.spotify.com/(track|album|user)/"],           "//embed.spotify.com/oembed/");
  addProvider("rdio.com",     ["rd.io/.+","rdio.com"],                            "//www.rdio.com/api/oembed/");
  addProvider("Soundcloud",   ["soundcloud.com/.+","snd.sc/.+"],                  "//soundcloud.com/oembed", {format: 'js', maxheight: 200});
  addProvider("twitter",      ["twitter.com/.+"],                                 "//api.twitter.com/1/statuses/oembed.json");
  addProvider("meetup",       ["meetup.(com|ps)/.+"],                             "//api.meetup.com/oembed");
  addProvider("vimeo",        ["vimeo.com/groups/.*/videos/.*", "vimeo.com/.*"],  "//vimeo.com/api/oembed.json");
	addProvider("dailymotion",  ["dailymotion.com/.+"],                             "//www.dailymotion.com/services/oembed");
  addProvider("ustream",      ["ustream.tv/recorded/.*"],                         "//www.ustream.tv/oembed");
  addProvider("photobucket",  ["photobucket.com/(albums|groups)/.+"],             "//photobucket.com/oembed/");
  addProvider("slideshare",   ["slideshare.net"],                                 "//www.slideshare.net/api/oembed/2",{format:'jsonp'});

  // NoEmbed fallbacks (http://noembed.com/)
  addProvider("wikipedia",    ["wikipedia.org/wiki/"],                            "//noembed.com/embed");
  addProvider("youtube",      ["youtube.com/watch"],                              "//noembed.com/embed");
  addProvider("instagram",    ["instagr.?am(.com)?/p/"],                          "//noembed.com/embed");
  addProvider("gist",         ["gist.github.com/.+/.+"],                          "//noembed.com/embed");

  // FIXME Wrong embed size, overflows
  //addProvider("vine",       ["vine.co/v/"],                                     "//noembed.com/embed");
  //addProvider("ted",        ["ted.com/talks/"],                                 "//noembed.com/embed");

  oEmbed.parse        = parse;
  oEmbed.supported    = supported;
  oEmbed.addProvider  = addProvider;
  oEmbed.defaults     = defaults;

  return oEmbed;

}));
