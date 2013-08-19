/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

/* @const */
var HTML_ENTITIES = {
  '&': '&amp;',
  '>': '&gt;',
  '<': '&lt;',
  '"': '&quot;',
  "'": '&#39;'
};

var SAFE_HTML_RE = /[&"'><]/g;

// HTML escaping
module.exports = function safeHtml(text) {
  return text && text.replace(SAFE_HTML_RE, function(character) {
    return HTML_ENTITIES[character];
  });
};
