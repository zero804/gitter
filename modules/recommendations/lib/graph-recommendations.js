'use strict';

var env   = require('gitter-web-env');
var cypher = require("cypher-promise");
var neo4jClient = cypher(env.config.get('neo4j:endpoint'));
var debug = require('debug')('gitter:graph-recommendations');

function query(text, params) {
  debug("neo4j query: %s %j", text, params);
  return neo4jClient.query(text, params);
}

function queryRoomRecommedations(roomId, userId) {
  roomId = '' + roomId;

  if (userId) {
    userId = '' + userId;

    /* Given a user .... */
    return query("MATCH (r:Room)-[:MEMBER]-(:User)-[:MEMBER]-(r2:Room), (u:User) " +
                 "WHERE u.userId = {userId} AND r.roomId = {roomId} AND NOT(u-[:MEMBER]-r2) AND r2.security = 'PUBLIC'" +
                 "RETURN r2.roomId, count(*) as occurrence " +
                 "ORDER BY occurrence DESC " +
                 "LIMIT 6",
    {
      roomId: roomId,
      userId: userId,
    });
  }

  /* Anonymous query */
  return query("MATCH (r:Room)-[:MEMBER]-(:User)-[:MEMBER]-(r2:Room)" +
               "WHERE r.roomId = {roomId} AND r2.security = 'PUBLIC'" +
               "RETURN r2.roomId, count(*) as occurrence " +
               "ORDER BY occurrence DESC " +
               "LIMIT 6",
  {
    roomId: roomId
  });
}
/** Returns the ids of rooms recommended for the current user */
function getRoomRecommendations(roomId, userId) {
  return queryRoomRecommedations(roomId, userId)
    .then(function(results) {
      return results.data.map(function(f) {
        /* Return the roomId only */
        return f[0];
      });
    });

}
exports.getRoomRecommendations = getRoomRecommendations;

/* Returns the ids of rooms recommendationed for the current user */
function getUserRecommendations(userId) {
  userId = '' + userId;
  return query("MATCH (u:User)-[:MEMBER]->(:Room)-[:MEMBER]-(:User)-[:MEMBER]-(r:Room) " +
               "WHERE u.userId = {userId} AND NOT(u-[:MEMBER]-r) AND r.security = 'PUBLIC'" +
               "RETURN r.roomId, count(*) as occurrence " +
               "ORDER BY occurrence DESC " +
               "LIMIT 6",
          {
            userId: userId,
          })
    .then(function(results) {
      return results.data.map(function(f) {
        return f[0];
      });
    });
}
exports.getUserRecommendations = getUserRecommendations;
