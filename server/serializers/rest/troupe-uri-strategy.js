/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var collections       = require("../../utils/collections");
var execPreloads      = require('../exec-preloads');
var TroupeStrategy    = require('./troupe-strategy');
var leanTroupeDao     = require('../../services/daos/troupe-dao').lean;

function TroupeUriStrategy(options) {
  var troupeStrategy = new TroupeStrategy(options);
  var troupesIndexed;

  this.preload = function(uris, callback) {
    return leanTroupeDao.findByUris(uris)
      .then(function(troupes) {
        troupesIndexed = collections.indexByProperty(troupes, 'uri');

        return execPreloads([{
          strategy: troupeStrategy,
          data: troupes
        }]);
      })
      .nodeify(callback);

  };

  this.map = function(uri) {
    var troupe = troupesIndexed[uri];
    if(!troupe) return null;
    return troupeStrategy.map(troupe);
  };

}
TroupeUriStrategy.prototype = {
  name: 'TroupeUriStrategy'
};

module.exports = TroupeUriStrategy;
