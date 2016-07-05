"use strict";

var env = require('gitter-web-env');
var stats = env.stats;

var Promise = require('bluebird');
var _ = require('underscore');
var languageDetector = require('../utils/language-detector');
var languageAnalyzerMapper = require('../utils/language-analyzer-mapper');
var client = require('../utils/elasticsearch-client').v1;


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

var parseQuery = Promise.method(function (textQuery, userLang) {
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

function performQuery(troupeId, parsedQuery, options) {
  var query = getElasticSearchQuery(troupeId, parsedQuery);

  var queryRequest = {
    size: options.limit || 10,
    from: options.skip,
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

  var startTime = Date.now();

  return client.search(queryRequest)
    .then(function(response) {
      stats.responseTime('chat.search.exec', Date.now() - startTime);

      return response.hits.hits.map(function(hit) {
        return {
          id: hit._id,
          highlights: hit.highlight && extractHighlights(hit.highlight.text)
        };
      });
    })
    .catch(function(err) {
      stats.event('chat.search.error');
      throw err;
    });
}

/**
 * Search for messages in a room using a full-text index.
 *
 * Returns promise messages
 */
exports.searchChatMessagesForRoom = function(troupeId, textQuery, options) {
  if(!options) options = {};

  options = _.defaults(options, {
    limit: 50,
    skip: 0
  });

  return parseQuery(textQuery, options.lang)
    .then(function(parsedQuery) {
      // TODO: deal with limit and skip
      var searchResults = performQuery(troupeId, parsedQuery, options);

      return searchResults;
    });
};
