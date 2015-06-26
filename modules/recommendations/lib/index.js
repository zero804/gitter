'use strict';

var cypher = require("cypher-promise");
var neo4jClient = cypher('http://192.168.99.100:7474');

/** Returns the ids of rooms recommended for the current user */
function getRoomRecommendations(roomId, userId) {
  return neo4jClient.query('MATCH (:Room)-[:MEMBER]-(:User)-[:MEMBER]-(r:Room), (u:User)' +
                           'WHERE u.userId = {userId} AND r.roomId= {roomId} AND NOT(u-[:MEMBER]-r) ' +
                           'RETURN r.roomId, count(*) as occurrence ' +
                           'ORDER BY occurrence DESC ' +
                           'LIMIT 20',
          {
            roomId: '' + roomId,
            userId: '' + userId,
          })
    .then(function(results) {
      return results.data.map(function(f) {
        return f[0];
      });
    });

}
exports.getRoomRecommendations = getRoomRecommendations;

/* Returns the ids of rooms recommendationed for the current user */
function getUserRecommendations(userId) {
  return neo4jClient.query('MATCH (u:User)-[:MEMBER]->(:Room)-[:MEMBER]-(:User)-[:MEMBER]-(r:Room) ' +
                           'WHERE u.userId = {userId} AND NOT(u-[:MEMBER]-r) ' +
                           'RETURN r.roomId, count(*) as occurrence ' +
                           'ORDER BY occurrence DESC ' +
                           'LIMIT 20',
          {
            userId: '' + userId,
          })
    .then(function(results) {
      return results.data.map(function(f) {
        return f[0];
      });
    });
}
exports.getUserRecommendations = getUserRecommendations;
