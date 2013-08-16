/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'handlebars',
  'twitter-text'
], function ( Handlebars, TwitterText ) {
  "use strict";

  var emailRegex = /\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*/gi;

  function embedMailto(email) {
    return '<a href="mailto:' + email + '">' + email + '</a>';
  }

  function linkify(message, urls) {
    if (urls && urls.length) {
      message = TwitterText.txt.autoLinkEntities(message, urls, {targetBlank: true, urlClass: 'link'});
    }

    // TODO: these should be linked in the same way by the server
    message = message.replace(emailRegex, embedMailto);

    return new Handlebars.SafeString(message);
  }

  Handlebars.registerHelper( 'linkify', linkify );
  return linkify;
});
