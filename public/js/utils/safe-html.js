/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([], function() {
  "use strict";

  /* @const */
  var HTML_ENTITIES = {
    '&': '&amp;',
    '>': '&gt;',
    '<': '&lt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  /* @const */
  var UNSAFE_ENTITIES = {
    '&amp;': '&',
    '&gt;': '>',
    '&lt;': '<',
    '&quot;': '"',
    '&#39;': "'"
  };

  var SAFE_HTML_RE = /[&"'><]/g;
  var UNSAFE_HTML_RE = /&(amp|gt|lt|quot|\#39);/g;

  function safeHtml(text) {
    return text && text.replace(SAFE_HTML_RE, function(character) {
      return HTML_ENTITIES[character];
    });
  }


  function unsafeHtml(text) {
    return text && text.replace(UNSAFE_HTML_RE, function(term) {
      return UNSAFE_ENTITIES[term];
    });
  }

  safeHtml.unsafe = unsafeHtml;


  // HTML escaping
  return safeHtml;

});