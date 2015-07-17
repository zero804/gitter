/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var Q      = require("q");

function execPreloads(preloads, callback) {
  if(!preloads) return Q.resolve().nodeify(callback);

  var promises = preloads.map(function(i) {
    var deferred = Q.defer();
    i.strategy.preload(i.data, deferred.makeNodeResolver());
    return deferred.promise;
  });

  return Q.all(promises)
      .nodeify(callback);
}


module.exports = execPreloads;
