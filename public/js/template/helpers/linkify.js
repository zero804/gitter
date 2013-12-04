/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'underscore',
  'handlebars',
  'twitter-text'
], function ( _, Handlebars, TwitterText ) {
  "use strict";

  function linkify(message, urls, mentions) {
    var plainUrls = urls.map(function(urlData) {
      var clone = _.clone(urlData);
      clone.url = _.unescape(clone.url);
      return clone;
    });

    var entities = plainUrls.concat(mentions);
    var options = {
      targetBlank: true,
      urlClass: 'link',
      usernameIncludeSymbol: true,
      usernameUrlBase: '/',
      usernameClass: 'mention'
    };

    message = TwitterText.txt.autoLinkEntities(message, entities, options);

    return new Handlebars.SafeString(message);
  }

  Handlebars.registerHelper( 'linkify', linkify );
  return linkify;
});
