'use strict';

var config = require('gitter-web-env').config;
var Promise = require('bluebird');
var client = require('./elasticsearch-client');
var applyStandardQueryOptions = require('./apply-standard-query-options');

const DEFAULT_QUERY_TIMEOUT = parseInt(config.get('elasticsearch:defaultQueryTimeout'), 10) || 500;

function searchChatsForUserId(userId, options) {
  var queryRequest = {
    index: 'gitter-primary',
    type: 'chat',
    body: {
      query: {
        bool: {
          must: [
            {
              term: {
                fromUserId: userId
              }
            }
          ],
          must_not: [],
          should: []
        }
      }
    }
  };

  applyStandardQueryOptions(queryRequest, options);

  return client.search(queryRequest);
}

module.exports = {
  searchChatsForUserId: Promise.method(searchChatsForUserId)
};
