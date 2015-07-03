'use strict';

var graphRecommendations = require('./graph-recommendations');

/** Returns the ids of rooms recommended for the current user */
function getRoomRecommendations(room, user, locale) {
  return graphRecommendations.getRoomRecommendations(room, user, locale);
}
exports.getRoomRecommendations = getRoomRecommendations;

/* Returns the ids of rooms recommendationed for the current user */
function getUserRecommendations(user, locale) {
  return graphRecommendations.getUserRecommendations(user, locale);
}
exports.getUserRecommendations = getUserRecommendations;
