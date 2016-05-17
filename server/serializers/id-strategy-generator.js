"use strict";

var collections = require("../utils/collections");
var Promise = require('bluebird');
var debug = require('debug')('gitter:serializer:id-loader');
var Lazy = require('lazy.js');

function idStrategyGenerator(name, FullObjectStrategy, loaderFunction) {
  var Strategy = function IdStrategy(options) {
    var strategy = new FullObjectStrategy(options);
    var objectHash;

    this.preload = Promise.method(function(ids) {
      if (ids.isEmpty()) return;

      var time = debug.enabled && Date.now();

      var idArray = ids.toArray();
      return loaderFunction(idArray)
        .then(function(fullObjects) {
          var duration = debug.enabled && Date.now() - time;
          debug("%s loaded %s items from ids in %sms", name, idArray.length, duration);

          objectHash = collections.indexById(fullObjects);

          return strategy.preload(Lazy(fullObjects));
        });
    });

    this.map = function(id) {
      var fullObject = objectHash[id];

      if(!fullObject) {
        return null;
      }

      return strategy.map(fullObject);
    };

    if (strategy.postProcess) {
      this.postProcess = function(results) {
        return strategy.postProcess(results);
      };
    }

  };

  Strategy.prototype = {
    name: name
  };

  return Strategy;
}
module.exports = idStrategyGenerator;
