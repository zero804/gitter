"use strict";

var Promise = require('bluebird');
var client = require('../utils/elasticsearch-client').v1;
var _ = require('underscore');

exports.searchRooms = function(queryText, userId, privateRoomIds, options) {
  options = _.defaults(options, { limit: 5 });

  var queryTextEscaped = queryText.replace(/([^\s]+\/([^\s]+(\/[^\s]+)?)?)/g,'"$1"');

  var queryRequest = {
    size: options.limit || 10,
    timeout: 500,
    index: 'gitter-primary',
    type: 'room',
    body: {
      fields: ["_id"],
      query: {
        function_score: {
          query: {
            bool: {
              must: [{
                bool: {
                  should: [{
                    prefix: {
                      uri: {
                        value: queryText
                      }
                    }
                  },{
                    query_string: {
                      query: queryTextEscaped,
                      default_operator: 'AND',
                      lenient: true
                    }
                  }],
                  minimum_should_match: 1
                }
              }],
              should: [
                {
                  term: {
                    security: "PUBLIC"
                  }
                },{
                  term: {
                    ownerUserId: userId
                  }
                },{
                  ids: {
                    type: "room",
                    values: privateRoomIds
                  }
                },{
                  bool: {
                    must: [
                      {
                        term: {
                          security: "INHERITED"
                        }
                      },{
                        terms: {
                          parentId: privateRoomIds,
                          minimum_should_match: 1
                        }
                      }
                    ]
                  }
                }
              ],
              minimum_number_should_match: 1
            }

          },
          functions: [{
            field_value_factor: {
              field: "userCount",
              factor: 1.2,
              modifier: "sqrt"
            }
          }]
        }
      },
      sort: [
        { _score: { order : "desc"} }
      ],
    }
  };

  return client.search(queryRequest)
    .then(function(response) {
      return response.hits.hits.map(function(hit) {
        return hit._id;
      });
    });
};
