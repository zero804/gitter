/*jshint node: true */
"use strict";

module.exports = function(req) {
  if(req.i18n && req.i18n.locale) return req.i18n.locale;
  return 'en-GB';
  // if(!req || !req.headers) return DEFAULT;

  // var language = req.headers['accept-language'];
  // if(language) {
  //   var array = language.split(';')[0].split(',');
  //   if(array.length) {
  //     return array;
  //   }
  // }

  // return DEFAULT;
};
