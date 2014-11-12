"use strict";


module.exports = (function() {


  /* THIS IS FOR AN EMERGENCY FIX ONLY. Use hbs double brackets instead {{}} */

  /* @const */
  var HTML_ENTITIES = {
    '&': '&amp;',
    '>': '&gt;',
    '<': '&lt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  var SAFE_HTML_RE = /[&"'><]/g;

  function safeHtml(text) {
    return text && text.replace(SAFE_HTML_RE, function(character) {
      return HTML_ENTITIES[character];
    });
  }

  // HTML escaping
  return safeHtml;


})();

