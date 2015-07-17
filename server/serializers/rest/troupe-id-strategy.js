/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeService     = require("../../services/troupe-service");
var winston           = require('../../utils/winston');
var collections       = require("../../utils/collections");
var execPreloads      = require('../exec-preloads');
var TroupeStrategy    = require('./troupe-strategy');
var debug             = require('debug')('troupe-id-strategy');

function TroupeIdStrategy(options) {
  var troupeStrategy = new TroupeStrategy(options);
  var troupesIndexed;

  this.preload = function(ids, callback) {
    troupeService.findByIds(ids, function(err, troupes) {
      if(err) {
        winston.error("Error loading troupes", { exception: err });
        return callback(err);
      }
      troupesIndexed = collections.indexById(troupes);

      execPreloads([{
        strategy: troupeStrategy,
        data: troupes
      }], callback);

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
