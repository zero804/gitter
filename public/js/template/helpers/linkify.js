/*jshint unused:true browser:true*/
require([
  'handlebars'
], function ( Handlebars ) {
  "use strict";

  var re =/\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.-]+[.][a-z]{2,4}\/)(?:(?:[^\s()<>.]+[.]?)+|((?:[^\s()<>]+|(?:([^\s()<>]+)))))+(?:((?:[^\s()<>]+|(?:([^\s()<>]+))))|[^\s`!()[]{};:'".,<>?«»“”‘’]))/gi;
  var mailRe = /(\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,6})/gim;

  var hasSchemeRE = /^\w*(\/\/)?:/;

  function webMatch(match) {
    var urlLink = match;
    if(!hasSchemeRE.test(match)) {
      urlLink = "http://" + urlLink;
    }

    return "<a target='_blank' href='" + urlLink + "'>" + match + "</a>";
  }

  function linkify ( value ) {
    value = value ? value : "";
    value = value.replace(re, webMatch);
    value = value.replace(mailRe, '<a href="mailto:$1">$1</a>');

    return new Handlebars.SafeString(value);
  }

  Handlebars.registerHelper( 'linkify', linkify );
  return linkify;
});
