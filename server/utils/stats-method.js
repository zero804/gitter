'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var statsd = env.createStatsClient({ });

function statsMethod(fn, methodIdentifier, loggingFn) {
  return function() {
    var args = Array.prototype.slice.call(arguments);
    var self = this;
    var start = process.hrtime();
    return fn.apply(self, args)
      .catch(function(err) {
        args.unshift(null);
        var loggerInfo = loggingFn.apply(self, args);
        var tags = loggerInfo.tags;

        if (tags) {
          tags.push('method:' + methodIdentifier);
        } else {
          tags = ['method:' + methodIdentifier];
        }

        stats.event(methodIdentifier + '_failed', loggerInfo.meta);
        statsd.increment('method.fail', 1, 1, loggerInfo.tags);

        throw err;
      })
      .tap(function(result) {
        var time = process.hrtime(start);
        var timeMillis = time[0] * 1e3 + time[1] / 1e6;

        args.unshift(result);
        var loggerInfo = loggingFn.apply(self, args);
        var tags = loggerInfo.tags;

        if (tags) {
          tags.push('method:' + methodIdentifier);
        } else {
          tags = ['method:' + methodIdentifier];
        }

        stats.event(methodIdentifier, loggerInfo.meta);
        statsd.timing('method.success', timeMillis, 1, tags);
      })
  }
}

module.exports = statsMethod;
