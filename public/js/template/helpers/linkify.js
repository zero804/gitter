/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
require([
  'handlebars'
], function ( Handlebars ) {
  "use strict";

  var emailRegex  = /\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*/gi;
  var urlRegex    = /\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.-]+[.][a-z]{2,4}\/)(?:(?:[^\s()<>.]+[.]?)+|((?:[^\s()<>]+|(?:([^\s()<>]+)))))+(?:((?:[^\s()<>]+|(?:([^\s()<>]+))))|[^\s`!()[]{};:'".,<>?«»“”‘’]))/gi;

  function embedUrl(url) {
    var displayUrl = url;
    if (url.indexOf('http') !== 0) url = 'http://' + url;
    return "<a class='link' target='_blank' href='" + url + "'>" + displayUrl + "</a>";
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
