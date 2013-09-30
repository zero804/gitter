/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'underscore',
  'handlebars',
  'twitter-text'
], function ( _, Handlebars, TwitterText ) {
  "use strict";

  function linkify(message, urls) {
    if (urls && urls.length) {

      var plainUrls = urls.map(function(urlData) {
        var clone = _.clone(urlData);
        clone.url = _.unescape(clone.url);
        return clone;
      });

      message = TwitterText.txt.autoLinkEntities(message, plainUrls, {targetBlank: true, urlClass: 'link'});
    }

    return new Handlebars.SafeString(message);
  }

  Handlebars.registerHelper( 'linkify', linkify );
  return linkify;
});
