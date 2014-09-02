/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var winston = require('../utils/winston');
var collections = require("../utils/collections");
var execPreloads = require('./exec-preloads');

function idStrategyGenerator(name, FullObjectStrategy, loaderFunction) {
  var Strategy = function IdStrategy(options) {
    var strategy = new FullObjectStrategy(options);
    var objectHash;

    this.preload = function(ids, callback) {
      return loaderFunction(ids)
        .then(function(fullObjects) {
          objectHash = collections.indexById(fullObjects);

          return execPreloads([{
            strategy: strategy,
            data: fullObjects
          }]);
        })
        .nodeify(callback);
    };


    this.map = function(id) {
      var fullObject = objectHash[id];

      if(!fullObject) {
        winston.warn("Unable to locate object ", { id: id, strategy: Strategy.prototype.name });
        return null;
      }

      return strategy.map(fullObject);
    };

  };

  Strategy.prototype = {
    name: name
  };

  return Strategy;
}
module.exports = idStrategyGenerator;

