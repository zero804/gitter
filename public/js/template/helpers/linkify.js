/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
require([
  'handlebars'
], function ( Handlebars ) {
  "use strict";

  var emailRegex  = /(\S+@\S+\.\S+)/gi;
  var urlRegex    = /\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.-]+[.][a-z]{2,4}\/)(?:(?:[^\s()<>.]+[.]?)+|((?:[^\s()<>]+|(?:([^\s()<>]+)))))+(?:((?:[^\s()<>]+|(?:([^\s()<>]+))))|[^\s`!()[]{};:'".,<>?«»“”‘’]))/gi;


  function embedUrl(url) {
    var m = url.match(/https?:\/\/([\w\.\/]+)([\:\?\#].+)?/);

    // Rexexp are delicate so better wrap them...
    try {
      if (m && m[1] && m[1].match(/(\.jpe?g|\.png|\.gif)$/)) {
        return '<a target="_blank" href="' + url + '"><img class="embed" src="' + url + '"></a>';
      } else if (url.match(/youtube/)) {
        var video_id = url.match(/https?:\/\/(www.)?youtube.com\/(embed\/|watch\?v=)(\S+)/)[3];
        return '<iframe class="embed" src="http://www.youtube.com/embed/' + video_id + '" width="380" height="280" frameborder="0"/>';
      } else if (url.match(/vimeo/)) {
        var video_id = url.match(/https?:\/\/(www.)?vimeo.com\/(\w+)/)[2];
        return '<iframe class="embed" src="http://player.vimeo.com/video/' + video_id + '" width="380" height="280" frameborder="0">';
      } else {
        return "<a target='_blank' href='" + url + "'>" + url + "</a>";
      }
    } catch(err) {
      return "<a target='_blank' href='" + url + "'>" + url + "</a>";
    }
  }

  function embedMailto(email) {
    return '<a href="mailto:' + email + '">' + email + '</a>';
  }

  function linkify(message) {
    message = message || ""; 
    message = message.replace(urlRegex,   embedUrl);
    message = message.replace(emailRegex, embedMailto);

    return new Handlebars.SafeString(message);
  }

  Handlebars.registerHelper( 'linkify', linkify );
  return linkify;
});
