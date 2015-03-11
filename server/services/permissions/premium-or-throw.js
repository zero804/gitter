/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var uriIsPremium = require('../uri-is-premium');
var StatusError  = require('statuserror');

module.exports = function premiumOrThrow(uri) {
  return uriIsPremium(uri)
    .then(function(isPremium) {
      if (isPremium) return true;

      var err = new StatusError(402 /* Payment required */, 'Payment required');
      err.uri = uri;
      throw err;
    });
};
