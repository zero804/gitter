/*jshint trailing:false, unused:true, node:true */
"use strict";

var persistence = require('./persistence-service');

function uriIsPremium(uri) {
  var lcUri = uri.toLowerCase();

  return persistence.Subscription.findOneQ({
    lcUri: lcUri,
    status: 'CURRENT'
  }, '_id', { lean: true })
    .then(function(subscription) {
      return !!subscription;
    });
}

module.exports = uriIsPremium;