/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var env          = require('../../utils/env');
var logger       = env.logger;
var uriIsPremium = require('../uri-is-premium');
var StatusError  = require('statuserror');

module.exports = function premiumOrThrow(uri) {
  return uriIsPremium(uri)
    .then(function(isPremium) {
      if(isPremium || env.config.get('premium:disabled')) return true;

      var err = new StatusError(402 /* Payment required */, 'Payment required');
      err.uri = uri;
      throw err;
    })
};
