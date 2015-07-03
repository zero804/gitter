/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var graphRecommendations = require('gitter-web-recommendations');
var legacyRecommendations = require('./recommendations/legacy-recommendations');

function getSuggestionsForUser(user, locale) {
  // TODO: deal with locale
  return graphRecommendations.getUserRecommendations(user, locale);
  // return legacyRecommendations.getUserRecommendations(user, locale);
}
exports.getSuggestionsForUser = getSuggestionsForUser;

/** Return rooms like the provided room */
function getSuggestionsForRoom(room, user) {
  return graphRecommendations.getRoomRecommendations(room, user);
}
exports.getSuggestionsForRoom = getSuggestionsForRoom;
