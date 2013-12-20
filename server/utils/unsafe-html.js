/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

/*==========================================================================================
 * DEPRECATED! Only hear to deal with old messages that need massaging
 *==========================================================================================
 */

/* @const */
var UNSAFE_ENTITIES = {
  '&amp;': '&',
  '&gt;': '>',
  '&lt;': '<',
  '&quot;': '"',
  '&#39;': "'"
};

var UNSAFE_HTML_RE = /&(amp|gt|lt|quot|\#39);/g;

module.exports = function unsafeHtml(text) {
  return text && text.replace(UNSAFE_HTML_RE, function(term) {
    return UNSAFE_ENTITIES[term];
  });
};
