'use strict';

var persistence = require('../persistence-service');
var esClient = require('../../utils/elasticsearch-client');
var Q = require('q');

function roomsWithSimilarTags(tags, topic) {
  var tagText = tags && tags.length ? tags.join(' ') : '';

  if (!tagText && !topic) return Q.resolve([]);
  var text = tagText + ' ' + (topic || '');

  var queryRequest = {
    size: 10,
    timeout: 500,
    index: 'gitter-primary',
    type: 'room',
    fields: ["uri", "githubType"],
    body: {
      "query": {
        "filtered" : {
          "query" : {
            "more_like_this": {
              "fields": [
                "tags",
                "topic"
              ],
              "like_text": text,
              "min_doc_freq": 1,
              "min_term_freq": 0,
              "percent_terms_to_match": 0.01
            }
          },
          "filter" : {
            "term" : {
              "security" : "PUBLIC"
            }
          }
        }

      }
    }
  };


  return esClient.search(queryRequest)
    .then(function(response) {
      return response.hits.hits.map(function(hit) {
        return {
          uri: hit.fields.uri && hit.fields.uri[0],
          githubType: hit.fields.githubType && hit.fields.githubType[0],
          similarTagsScore: hit._score
        };
      });
    });

}

module.exports = function similarTags(user, roomUri) {
  if (!roomUri) return [];

  return persistence.Troupe.findOneQ({ lcUri: roomUri.toLowerCase() }, { _id: 1, tags: 1, topic: 1 })
    .then(function(room) {
      return roomsWithSimilarTags(room.tags, room.topic);
    });
};
