/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var Q       = require("q");
var winston = require('../utils/winston');
var fs      = require('fs');
var path    = require('path');

/* This method should move */
function serialize(items, strat, callback) {
  var d = Q.defer();

  if(!items) {
    return Q.resolve().nodeify(callback);
  }

  var single = !Array.isArray(items);
  if(single) {
    items = [ items ];
  }

  function pkg(i) {
    return single ? i[0] : i;
  }

  strat.preload(items, function(err) {

    if(err) {
      winston.error("Error during preload", { exception: err });
      return d.reject(err);
    }

    d.resolve(pkg(items.map(strat.map).filter(function(f) { return f !== undefined; })));
  });

  return d.promise.nodeify(callback);

}

function serializeExcludeNulls(items, strat, callback) {
  var single = !Array.isArray(items);

  return serialize(items, strat)
    .then(function(results) {
      if(single) return results;
      return results.filter(function(f) { return !!f; });
    })
    .nodeify(callback);
}

// XXX: deprecated
function serializeQ(items, strat) {
  return serialize(items, strat);
}


// TODO: deprecate this....
function getStrategy(modelName) {
  switch(modelName) {
    case 'chat':
      return restSerializer.ChatStrategy;
    case 'chatId':
      return restSerializer.ChatIdStrategy;
    case 'troupe':
      return restSerializer.TroupeStrategy;
    case 'troupeId':
      return restSerializer.TroupeIdStrategy;
    case 'user':
      return restSerializer.UserStrategy;
  }
}

function serializeModel(model, callback) {
  if(model === null) return Q.resolve().nodeify(callback);

  var schema = model.schema;
  if(!schema) return Q.reject(new Error("Model does not have a schema")).nodeify(callback);
  if(!schema.schemaTypeName) return Q.reject(new Error("Schema does not have a schema name")).nodeify(callback);

  var strategy;

  switch(schema.schemaTypeName) {
    case 'UserSchema':
      strategy = new restSerializer.UserStrategy();
      break;

    case 'TroupeSchema':
      strategy = new restSerializer.TroupeStrategy();
      break;

    case 'TroupeUserSchema':
      strategy = new restSerializer.TroupeUserStrategy();
      break;

    case 'TroupeBanStrategy':
      strategy = new restSerializer.TroupeBanStrategy();
      break;

    case 'ChatMessageSchema':
      strategy = new restSerializer.ChatStrategy();
      break;

    case 'EventSchema':
      strategy = new restSerializer.EventStrategy();
      break;

  }

  if(!strategy) return Q.reject(new Error("No strategy for " + schema.schemaTypeName)).nodeify(callback);

  return serialize(model, strategy, callback);
}

function eagerLoadStrategies() {
  Object.keys(restSerializer).forEach(function(key) {
    restSerializer[key];
  });
}

var restSerializer = {
  getStrategy: getStrategy,
  serialize: serialize,
  serializeExcludeNulls: serializeExcludeNulls,
  serializeQ: serializeQ,
  serializeModel: serializeModel,
  testOnly: {
    eagerLoadStrategies: eagerLoadStrategies
  }
};


fs.readdirSync(__dirname + '/rest').forEach(function(fileName) {
  if(!/\.js$/.test(fileName)) return;

  var baseName = path.basename(fileName, '.js');

  var strategyName = baseName.replace(/\-./g, function(match) {
    return match[1].toUpperCase();
  }).replace(/^./, function(match) {
    return match.toUpperCase();
  });

  Object.defineProperty(restSerializer, strategyName, {
    enumerable: true,
    configurable: true,
    get: function() {
      var strategy = require('./rest/' + baseName);

      Object.defineProperty(restSerializer, strategyName, {
        enumerable: true,
        configurable: false,
        writable: false,
        value: strategy
      });

      return strategy;
    }
  });
});

module.exports = restSerializer;
