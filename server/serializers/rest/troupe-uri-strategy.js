/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeService     = require("../../services/troupe-service");
var winston           = require('../../utils/winston');
var collections       = require("../../utils/collections");
var execPreloads      = require('../exec-preloads');
var TroupeStrategy    = require('./troupe-strategy');

function TroupeUriStrategy(options) {
  var troupeStrategy = new TroupeStrategy(options);
  var self = this;

  this.preload = function(uris, callback) {
    troupeService.findAllByUri(uris, function(err, troupes) {
      if(err) {
        winston.error("Error loading troupes", { exception: err });
        return callback(err);
      }

      self.troupes = collections.indexByProperty(troupes, 'uri');

      execPreloads([{
        strategy: troupeStrategy,
        data: troupes
      }], callback);

    });
  };

  this.map = function(uri) {
    var troupe = self.troupes[uri];
    if(!troupe) return null;
    return troupeStrategy.map(troupe);
  };

}

module.exports = TroupeUriStrategy;