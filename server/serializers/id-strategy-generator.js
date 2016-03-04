"use strict";

// var winston = require('../utils/winston');
var collections = require("../utils/collections");
var Promise = require('bluebird');
var debug = require('debug')('gitter:serializer:id-loader');

function idStrategyGenerator(name, FullObjectStrategy, loaderFunction) {
  var Strategy = function IdStrategy(options) {
    var strategy = new FullObjectStrategy(options);
    var objectHash;

    this.preload = Promise.method(function(ids) {
      if (!ids.length) return [];

      var time = debug.enabled && Date.now();
      return loaderFunction(ids)
        .then(function(fullObjects) {
          var duration = debug.enabled && Date.now() - time;
          debug("%s loaded %s items from ids in %sms", name, ids.length, duration);

          objectHash = collections.indexById(fullObjects);

          return strategy.preload(fullObjects);
        });
    });


    this.map = function(id) {
      var fullObject = objectHash[id];

      if(!fullObject) {
        // winston.warn("Unable to locate object ", { id: id, strategy: Strategy.prototype.name });
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
