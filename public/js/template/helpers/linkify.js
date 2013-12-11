/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'underscore',
  'handlebars',
  'twitter-text',
  'utils/context'
], function ( _, Handlebars, TwitterText, context ) {
  "use strict";

  function linkify(message, urls, mentions, issues) {
    var plainUrls = urls.map(function(urlData) {
      var clone = _.clone(urlData);
      clone.url = _.unescape(clone.url);
      return clone;
    });

    var hashtagIssues = issues.map(function(issue) {
      return {
        indices: issue.indices,
        hashtag: issue.number
      };
    });

    var entities = plainUrls.concat(mentions).concat(hashtagIssues);
    var options = {
      targetBlank: true,
      urlClass: 'link',
      usernameIncludeSymbol: true,
      usernameUrlBase: '/',
      usernameClass: 'mention',
      hashtagClass: 'issue',
      hashtagUrlBase: 'https://www.github.com/' + context().troupe.uri + '/issues/'
    };

    message = TwitterText.txt.autoLinkEntities(message, entities, options);

    return new Handlebars.SafeString(message);
  }

  Handlebars.registerHelper( 'linkify', linkify );
  return linkify;
});
