/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var Q      = require("q");
var env    = require('gitter-web-env');
var logger = env.logger;
var nconf  = env.config;
var stats  = env.stats;

var maxSerializerTime = nconf.get('serializer:warning-period');

function execPreloads(preloads, callback) {
  if(!preloads) return callback();

  var promises = preloads.map(function(i) {
    var deferred = Q.defer();
    i.strategy.preload(i.data, deferred.makeNodeResolver());
    var start = Date.now();
    return deferred.promise
      .then(function() {
        var time = Date.now() - start;

        if(time > maxSerializerTime) {
          stats.responseTime('serializer.slow.preload', time);

          logger.warn('Strategy took a excessive amount of time to complete', {
            strategy: i.strategy.name,
            time: time
          });
        }
      });
  });

  return Q.all(promises)
      .thenResolve() // No need to send back the results
      .nodeify(callback);
}


module.exports = execPreloads;
