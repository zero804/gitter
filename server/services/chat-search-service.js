"use strict";

var Q                    = require('q');
var roomCapabilities     = require('./room-capabilities');
var _                    = require('underscore');
var languageDetector     = require('../utils/language-detector');
var languageAnalyzerMapper = require('../utils/language-analyzer-mapper');

var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: 'localhost:9200',
  log: 'trace'
});

/* Magic way of figuring out the matching terms so that we can highlight */
function extractHighlights(text) {
  if(!text) return [];
  var results = [];
  text.forEach(function(t) {
    var re = /<m(\d)>(.*?)<\/m\1>/g;
    var match;
    while((match = re.exec(t)) !== null) {
      results[match[1]] = match[2];
    }
  });

  return results.filter(function(f) { return !!f; });
}

function performQuery(troupeId, textQuery, maxHistoryDate, options) {
  /* Horrible hack - rip a from:xyz field out of the textQuery */
  var fromUser;
  textQuery = textQuery.replace(/\bfrom:('[^']*'|"[^"]*"|[^'"]\w*)/g, function(wholeMatch, fromField) {
    fromUser = fromField;
    return "";
  });

  var query = {
    size: options.limit || 10,
    timeout: 500,
    index: 'gitter',
    type: 'chat',
    body: {
      fields: ["_id"],
      query: {
        bool: {
          must: [{
            term: { toTroupeId: String(troupeId) }
          }],
          should: []
        }
      },
      highlight: {
        order: "score",
        pre_tags: ["<m0>","<m1>","<m2>","<m3>","<m4>","<m5>"],
        post_tags: ["<m0>","</m1>","</m2>","</m3>","</m4>","</m5>"],
        fields: {
          text: {
            matched_fields: ["text"],
            type : "fvh"
          }
        },
      }
    }
  };

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

  var promiseChain;

  if(textQuery) {
    promiseChain = languageDetector(textQuery)
      .then(function(detectedLanguage) {
        var analyzers = { "default": true };

        if(options.lang) {
          analyzers[languageAnalyzerMapper(options.lang)] = true;
        }

        if(detectedLanguage) {
          analyzers[languageAnalyzerMapper(detectedLanguage)] = true;
        }

        Object.keys(analyzers).forEach(function(analyzer) {
          query.body.query.bool.should.push({
            query_string: {
              default_field: "text",
              query: textQuery,
              analyzer: analyzer,
              default_operator: "AND"
            }
          });
        });

        query.body.query.bool.minimum_should_match = 1;

        return Q(client.search(query));
      });
  } else {
    promiseChain = Q(client.search(query));
  }

  return promiseChain
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

  options = _.defaults(options, {
    limit: 50,
    skip: 0
  });

  return roomCapabilities.getMaxHistoryMessageDate(troupeId)
    .then(function(maxHistoryDate) {
      var findInaccessibleResults;

      // TODO: deal with limit and skip
      var searchResults = performQuery(troupeId, textQuery, maxHistoryDate, options);

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
