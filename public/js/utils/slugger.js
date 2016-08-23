'use strict';

var XRegExp = require('xregexp').XRegExp;

function slugger(text) {
  text = text.trim();
  var re = XRegExp('[^\\p{L}\\d\\_]+');
  var parts = XRegExp.split(text, re);

  return parts
    .filter(function(part) {
      return part.length > 0;
    })
    .join('-');
}

function isValid(text) {
  var re = XRegExp('^[\\p{L}\\d\\_\\-]+$');
  return XRegExp.test(text, re);
}

module.exports = slugger;
module.exports.isValid = isValid;
