'use strict';

var cypher = require("cypher-promise");
var neo4jClient = cypher('http://192.168.99.100:7474');

function queryRoomRecommedations(roomId, userId) {
  roomId = '' + roomId;

  if (userId) {
    userId = '' + userId;

    /* Given a user .... */
    return neo4jClient.query('MATCH (r:Room)-[:MEMBER]-(:User)-[:MEMBER]-(r2:Room), (u:User)' +
                   'WHERE u.userId = {userId} AND r.roomId = {roomId} AND NOT(u-[:MEMBER]-r2) ' +
                   'RETURN r2.roomId, count(*) as occurrence ' +
                   'ORDER BY occurrence DESC ' +
                   'LIMIT 20',
    {
      roomId: roomId,
      userId: userId,
    });
  }

  /* Anonymous query */
  return neo4jClient.query('MATCH (r:Room)-[:MEMBER]-(:User)-[:MEMBER]-(r2:Room)' +
                 'WHERE r.roomId = {roomId} ' +
                 'RETURN r2.roomId, count(*) as occurrence ' +
                 'ORDER BY occurrence DESC ' +
                 'LIMIT 20',
  {
    roomId: roomId
  });
}
/** Returns the ids of rooms recommended for the current user */
function getRoomRecommendations(roomId, userId) {
  return queryRoomRecommedations(roomId, userId)
    .then(function(results) {
      console.log('RESULTS', results);
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
  return neo4jClient.query('MATCH (u:User)-[:MEMBER]->(:Room)-[:MEMBER]-(:User)-[:MEMBER]-(r:Room) ' +
                           'WHERE u.userId = {userId} AND NOT(u-[:MEMBER]-r) ' +
                           'RETURN r.roomId, count(*) as occurrence ' +
                           'ORDER BY occurrence DESC ' +
                           'LIMIT 20',
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
