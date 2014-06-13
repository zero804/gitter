/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeService     = require("../../services/troupe-service");
var winston           = require('../../utils/winston');
var collections       = require("../../utils/collections");
var execPreloads      = require('../exec-preloads');
var TroupeStrategy    = require('./troupe-strategy');

function TroupeIdStrategy(options) {
  var troupeStrategy = new TroupeStrategy(options);
  var self = this;

  this.preload = function(ids, callback) {
    troupeService.findByIds(ids, function(err, troupes) {
      if(err) {
        winston.error("Error loading troupes", { exception: err });
        return callback(err);
      }
      self.troupes = collections.indexById(troupes);

      execPreloads([{
        strategy: troupeStrategy,
        data: troupes
      }], callback);

    });
  };

  this.map = function(troupeId) {
    var troupe = self.troupes[troupeId];
    if(!troupe) {
      winston.warn("Unable to locate troupeId ", { troupeId: troupeId });
      return null;
    }

    return troupeStrategy.map(troupe);
  };

}


module.exports = TroupeIdStrategy;