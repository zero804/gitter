/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'underscore',
  'handlebars',
  'twitter-text'
], function ( _, Handlebars, TwitterText ) {
  "use strict";

  function linkify(message, urls) {
    if (urls && urls.length) {
      urls.forEach(function(urlData) {
        urlData.url = _.unescape(urlData.url);
      });

      message = TwitterText.txt.autoLinkEntities(message, urls, {targetBlank: true, urlClass: 'link'});
    }

    return new Handlebars.SafeString(message);
  }

  Handlebars.registerHelper( 'linkify', linkify );
  return linkify;
});
