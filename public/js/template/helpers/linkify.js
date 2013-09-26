/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'handlebars',
  'twitter-text'
], function ( Handlebars, TwitterText ) {
  "use strict";

  function linkify(message, urls) {
    if (urls && urls.length) {
      message = TwitterText.txt.autoLinkEntities(message, urls, {targetBlank: true, urlClass: 'link'});
    }

    return new Handlebars.SafeString(message);
  }

  Handlebars.registerHelper( 'linkify', linkify );
  return linkify;
});
