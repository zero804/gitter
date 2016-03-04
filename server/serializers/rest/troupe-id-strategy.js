"use strict";

var troupeService  = require("../../services/troupe-service");
var collections    = require("../../utils/collections");
var TroupeStrategy = require('./troupe-strategy');
var debug          = require('debug')('troupe-id-strategy');

function TroupeIdStrategy(options) {
  var troupeStrategy = new TroupeStrategy(options);
  var troupesIndexed;

  this.preload = function(ids) {
    return troupeService.findByIds(ids)
      .then(function(troupes) {
        troupesIndexed = collections.indexById(troupes);

        return troupeStrategy.preload(troupes);
      });
  };

  this.map = function(troupeId) {
    var troupe = troupesIndexed[troupeId];
    if(!troupe) {
      debug("Unable to serialize troupe with ID %s as it was not found", troupeId);
      return null;
    }

    return troupeStrategy.map(troupe);
  };

}
TroupeIdStrategy.prototype = {
  name: 'TroupeIdStrategy'
};



module.exports = TroupeIdStrategy;
