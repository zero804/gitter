"use strict";

var Q                    = require('q');
var roomCapabilities     = require('./room-capabilities');
var _                    = require('underscore');
var languageDetector     = require('../utils/language-detector');
var languageAnalyzerMapper = require('../utils/language-analyzer-mapper');
var client               = require('../utils/elasticsearch-client');

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

function parseQuery(textQuery, userLang) {
  return Q.fcall(function() {
    /* Horrible hack - rip a from:xyz field out of the textQuery */
    var fromUser;
    textQuery = textQuery.replace(/\bfrom:('[^']*'|"[^"]*"|[^'"]\w*)/g, function(wholeMatch, fromField) {
      fromUser = fromField;
      return "";
    });

    if(!textQuery) {
      return {
        queryString: "",
        fromUser: fromUser,
        analyzers: ["default"]
      };
    }

    return languageDetector(textQuery)
      .then(function(detectedLanguage) {
        var analyzers = { "default": true };

        if(userLang) {
          analyzers[languageAnalyzerMapper(userLang)] = true;
        }

        if(detectedLanguage) {
          analyzers[languageAnalyzerMapper(detectedLanguage)] = true;
        }

        return {
          queryString: textQuery,
          fromUser: fromUser,
          analyzers: Object.keys(analyzers)
        };

      });

  });
}

function getElasticSearchQuery(troupeId, parsedQuery) {
  var query = {
    bool: {
      must: [{
        term: { toTroupeId: String(troupeId) }
      }],
      should: []
    }
  };

  if(parsedQuery.fromUser) {
    query.bool.must.push({
      has_parent: {
        parent_type: "user",
        query: {
          query_string: {
            query: parsedQuery.fromUser,
            default_operator: "AND"
          }
        }
      }
    });
  }

  if(parsedQuery.queryString) {
    parsedQuery.analyzers.forEach(function(analyzer) {
      query.bool.should.push({
        query_string: {
          default_field: "text",
          query: parsedQuery.queryString,
          analyzer: analyzer,
          default_operator: "AND"
        }
      });
    });

    query.bool.minimum_should_match = 1;
  }


  return query;
}

function performQuery(troupeId, parsedQuery, maxHistoryDate, options) {
  var query = getElasticSearchQuery(troupeId, parsedQuery);

  // Add the max-date term
  if(maxHistoryDate) {
    query.bool.must.push({
      range: {
        sent: {
          "gte" : maxHistoryDate,
        }
      }
    });
  }

  var queryRequest = {
    size: options.limit || 10,
    timeout: 500,
    index: 'gitter-primary',
    type: 'chat',
    body: {
      fields: ["_id"],
      query: query,
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
      },
      sort: [
        { _score: { order : "desc"} },
        { sent: { order : "desc"} }
      ],
    }
  };

  return Q(client.search(queryRequest))
    .then(function(response) {
      return response.hits.hits.map(function(hit) {
        return {
          id: hit._id,
          highlights: hit.highlight && extractHighlights(hit.highlight.text)
        };
      });
    });
}

function performQueryForInaccessibleResults(troupeId, parsedQuery, maxHistoryDate)  {
  var query = getElasticSearchQuery(troupeId, parsedQuery);
  query.bool.must.push({
    range: {
      sent: {
        "lt" : maxHistoryDate,
      }
    }
  });

  var countRequest = {
    timeout: 500,
    index: 'gitter-primary',
    type: 'chat',
    body: {
      query: query,
    }
  };

  return Q(client.count(countRequest))
    .then(function(result) {
      return result && result.count || 0;
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

  return parseQuery(textQuery, options.lang)
    .then(function(parsedQuery) {

        return roomCapabilities.getMaxHistoryMessageDate(troupeId)
          .then(function(maxHistoryDate) {
            var findInaccessibleResults;

            // TODO: deal with limit and skip
            var searchResults = performQuery(troupeId, parsedQuery, maxHistoryDate, options);

            if(maxHistoryDate) {
             findInaccessibleResults = performQueryForInaccessibleResults(troupeId, parsedQuery, maxHistoryDate);
            }

            return Q.all([searchResults, findInaccessibleResults]);
          })
          .spread(function(results, inaccessibleCount) {
            return [results, !!inaccessibleCount];
          });
    });

};
