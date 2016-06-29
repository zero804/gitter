"use strict";

var client = require('../utils/elasticsearch-client').v1;
var Promise = require('bluebird');
var assert = require('assert');

/**
 * returns heatmap to be used by cal-heatmap https://kamisama.github.io/cal-heatmap/#data-format
 * e.g { 1434412800: 2, 1437004800: 10, 1437091200: 2, 1437609600: 33, 1438128000: 46, ... }
 * basically, unix timestamps for each day with a count.
 *
 * startMonth and endMonth are optional, limits heatmap for archive nav view.
 */
exports.getHeatmapForRoom = function(roomId, startMonth, endMonth, tz) {
  assert(roomId, 'roomId required');

  tz = '' + (tz || '0:00');

  var filter = { term: { toTroupeId: roomId } };

  if (startMonth && endMonth) {
    filter = {
      and: {
        filters: [
          filter,
          {
            range: {
              sent: {
                // rounded down to first day in startMonth
                gte: startMonth.toISOString() + '||/M',
                // rounded up to last day in endMonth
                lte: endMonth.toISOString() + '||/M'
              }
            }
          }
        ]
      }
    };
  }

  var queryRequest = {
    timeout: 500,
    index: 'gitter-primary',
    type: 'chat',
    // limit the search type to only get the aggregation result, not the query
    searchType: 'count',
    body: {
      query: {
        filtered: {
          filter: filter
        }
      },
      aggregations: {
        messages_per_day: {
          date_histogram: {
            field: 'sent',
            interval: 'day',
            time_zone: tz
          }
        }
      }
    }
  };

  return Promise.resolve(client.search(queryRequest))
    .then(function(result) {
      return result.aggregations.messages_per_day.buckets.reduce(function(memo, bucket) {
        var unixTime = (bucket.key / 1000).toFixed(0);

        memo[unixTime] = bucket.doc_count;
        return memo;
      }, {});
    });
};
