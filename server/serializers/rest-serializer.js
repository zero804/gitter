/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var Q       = require("q");
var winston = require('../utils/winston');
var fs      = require('fs');
var path    = require('path');

/* This method should move */
function serialize(items, strat, callback) {
  if(!items) return callback(null, null);

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
      return callback(err);
    }

    callback(null, pkg(items.map(strat.map).filter(function(f) { return f !== undefined; })));
  });
}

function serializeExcludeNulls(items, strat, callback) {
  var single = !Array.isArray(items);

  return serialize(items, strat, function(err, results) {
    if(err) return callback(err);
    if(single) return callback(null, results);

    return callback(null, results.filter(function(f) { return !!f; }));
  });
}

function serializeQ(items, strat) {
  var d = Q.defer();
  serialize(items, strat, d.makeNodeResolver());
  return d.promise;
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
  if(model === null) return callback(null, null);
  var schema = model.schema;
  if(!schema) return callback("Model does not have a schema");
  if(!schema.schemaTypeName) return callback("Schema does not have a schema name");

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

  if(!strategy) return callback("No strategy for " + schema.schemaTypeName);


  serialize(model, strategy, callback);
}


var restSerializer = {
  getStrategy: getStrategy,
  serialize: serialize,
  serializeExcludeNulls: serializeExcludeNulls,
  serializeQ: serializeQ,
  serializeModel: serializeModel
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