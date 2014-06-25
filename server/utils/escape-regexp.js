/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

module.exports = function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
};