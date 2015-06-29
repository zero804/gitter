'use strict';

var graphRecommendations = require('./graph-recommendations');

/** Returns the ids of rooms recommended for the current user */
function getRoomRecommendations(roomId, userId) {
  return graphRecommendations.getRoomRecommendations(roomId, userId);
}
exports.getRoomRecommendations = getRoomRecommendations;

/* Returns the ids of rooms recommendationed for the current user */
function getUserRecommendations(userId) {
  return graphRecommendations.getUserRecommendations(userId);
}
exports.getUserRecommendations = getUserRecommendations;
