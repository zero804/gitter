"use strict";

var Q                    = require('q');
var roomCapabilities     = require('./room-capabilities');

var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: 'localhost:9200',
  log: 'trace'
});

/* Magic way of figuring out the matching terms so that we can highlight */
function extractHighlights(text) {
  if(!text) return [];
  var results = {};
  text.forEach(function(t) {
    t.replace(/<m(\d)>(.*?)<\m(\1)>/g,function(match, c1, c2) {
      results[c2] = true;
    });
  });

  return Object.keys(results);
}

function performQuery(troupeId, textQuery, maxHistoryDate) {
  /* Horrible hack - rip a from:xyz field out of the textQuery */
  var fromUser;
  textQuery = textQuery.replace(/\bfrom:('[^']*'|"[^"]*"|[^'"]\w*)/g, function(wholeMatch, fromField) {
    fromUser = fromField;
    return "";
  });

  var query = {
    size: 10,
    timeout: 500,
    index: 'gitter',
    type: 'chat',
    body: {
      fields: ["_id"],
      query: {
        bool: {
          must: [{
            term: { toTroupeId: String(troupeId) }
          }]
        }
      },
      highlight: {
        order: "score",
        pre_tags: ["<m0>","<m1>","<m2>","<m3>","<m4>","<m5>"],
        post_tags: ["<m0>","</m1>","</m2>","</m3>","</m4>","</m5>"],
        fields: {
          text: { "term_vector" : "with_positions_offsets" }
        }
      }
    }
  };

  if(textQuery) {
    query.body.query.bool.must.push({
      query_string: {
        default_field: "text",
        query: textQuery,
        default_operator: "AND"
      }
    });
  }

  if(fromUser) {
    query.body.query.bool.must.push({
      has_parent: {
        parent_type: "user",
        query: {
          query_string: {
            query: fromUser,
            default_operator: "AND"
          }
        }
      }
    });
  }

  // Add the max-date term

  if(maxHistoryDate) {
    query.body.query.bool.must.push({
      range: {
        sent: {
          "gte" : maxHistoryDate,
        }
      }
    });
  }

  return Q(client.search(query))
    .then(function(response) {
      return response.hits.hits.map(function(hit) {
        return {
          id: hit._id,
          highlights: hit.highlight && extractHighlights(hit.highlight.text)
        };
      });
    });
}

/**
 * Search for messages in a room using a full-text index.
 *
 * Returns promise [messages, limitReached]
 */
exports.searchChatMessagesForRoom = function(troupeId, textQuery, options) {
  if(!options) options = {};

  var limit = options.limit || 50;
  var skip = options.skip || 0;

  return roomCapabilities.getMaxHistoryMessageDate(troupeId)
    .then(function(maxHistoryDate) {
      var findInaccessibleResults;

      // TODO: deal with limit and skip
      var searchResults = performQuery(troupeId, textQuery, maxHistoryDate);

      if(maxHistoryDate) {
//        findInaccessibleResults =
// TODO: find out how many results are missing
      }

      return Q.all([searchResults, findInaccessibleResults])
        .spread(function(results, inaccessibleCount) {
          return [results, !!inaccessibleCount];
        });

    });
};
