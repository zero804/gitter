'use strict';

var env   = require('gitter-web-env');
var stats = env.stats;
var cypher = require("cypher-promise");
var neo4jClient = cypher(env.config.get('neo4j:endpoint'));
var debug = require('debug')('gitter:graph-suggestions');
var _ = require('lodash');

function query(text, params) {
  debug("neo4j query: %s %j", text, params);
  var start = Date.now();

  return neo4jClient.query(text, params)
    .then(function(response) {
      stats.responseTime('suggestions.graph.query', Date.now() - start);
      return response;
    })
    .catch(function(err) {
      stats.event('chat.search.error');
      throw err;
    });
  }

function queryRoomSuggestions(roomId, userId) {
  if (userId) {
    /* Given a user .... */
    return query("MATCH (r:Room)-[:MEMBER]-(:User)-[:MEMBER]-(r2:Room), (u:User) " +
                 "WHERE u.userId = {userId} AND r.roomId = {roomId} AND NOT(u-[:MEMBER]-r2) AND r2.security = 'PUBLIC'" +
                 "RETURN r2.roomId, count(*) * r2.weight as occurrence " +
                 "ORDER BY occurrence DESC " +
                 "LIMIT 6",
    {
      roomId: roomId,
      userId: userId
    });
  }

  /* Anonymous query */
  return query("MATCH (r:Room)-[:MEMBER]-(:User)-[:MEMBER]-(r2:Room)" +
               "WHERE r.roomId = {roomId} AND r2.security = 'PUBLIC'" +
               "RETURN r2.roomId, count(*) * r2.weight as occurrence " +
               "ORDER BY occurrence DESC " +
               "LIMIT 6",
  {
    roomId: roomId
  });
}
/** Returns the ids of rooms suggested for the current user */
function getSuggestionsForRoom(room, user/*, locale */) {
  return queryRoomSuggestions(room.id, user && user.id)
    .then(function(results) {
      return results.data.map(function(f) {
        /* Return the roomId only */
        return { roomId: f[0] };
      });
    });

}
exports.getSuggestionsForRoom = getSuggestionsForRoom;

/* Returns the ids of rooms suggested for the current user */
function getSuggestionsForUser(user /*, locale */) {
  return query("MATCH (u:User)-[:MEMBER]->(:Room)-[:MEMBER]-(:User)-[:MEMBER]-(r:Room) " +
               "WHERE u.userId = {userId} AND NOT(u-[:MEMBER]-r) AND r.security = 'PUBLIC'" +
               "RETURN r.roomId, count(*) * r.weight as occurrence " +
               "ORDER BY occurrence DESC " +
               "LIMIT 6",
          {
            userId: user.id,
          })
    .then(function(results) {
      return results.data.map(function(f) {
        return { roomId: f[0] };
      });
    });
}
exports.getSuggestionsForUser = getSuggestionsForUser;

function mostPopularItem(strings) {
  if (strings.length == 0) return undefined;
  /*
  var map = _.countBy(strings);
  var pairs = _.pairs(map);
  var max = _.max(pairs, _.last);
  return max[0];
  */
  return _.chain(strings).countBy().pairs().max(_.last).head().value();
}

function pickLanguageFromRooms(rooms) {
  // languages that aren't null or undefined
  // NOTE: only public rooms will have their languages filled in, at least
  // eventually.
  var languages = _(rooms).pluck('lang').filter().value();

  // try the most popular non-english one
  // (or is it better to go with just the most popular one?)
  var nonEnglish = _.filter(languages, function(lang) { return lang != 'en'; });
  var mostPopular;
  if (nonEnglish) {
    mostPopular = mostPopularItem(nonEnglish);
    if (mostPopular) {
      return mostPopular;
    }
  }

  // then fall back to english
  return 'en';
}

function getSuggestionsForRooms(rooms) {
  // NOTE: should we just use all the languages?
  var lang = pickLanguageFromRooms(rooms);
  console.log(lang);

  var roomIds = _.pluck(rooms, 'id');

  // NOTE: include way more than what we'll use, because we're only sampling
  // the input rooms and we'll be heavily filtering this list later.
  var qry = 'MATCH (r:Room)-[m:MEMBER]-(u:User) '+
    'WHERE r.roomId IN {roomIds} ' +
    'WITH u ORDER BY m.weight LIMIT 1000 ' +
    'MATCH (u)-[:MEMBER]-(r2:Room) ' +
    'WHERE r2.lang = "en" OR r2.lang = {lang} AND NOT r2.roomId IN {roomIds} AND r2.security <> "PRIVATE" ' +
    'RETURN r2.roomId AS roomId, count(r2) AS c ' +
    'ORDER BY c DESC ' +
    'LIMIT 20';

  var attrs = {roomIds: roomIds, lang: lang};
  return query(qry, attrs)
    .then(function(results) {
      return results.data.map(function(f) {
        return { roomId: f[0] };
      });
    });
}
exports.getSuggestionsForRooms = getSuggestionsForRooms;
