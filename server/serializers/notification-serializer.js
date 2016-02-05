"use strict";

var Promise = require('bluebird');
var createSerializer = require('./create-serializer');

function getStrategy(modelName) {
  switch(modelName) {
    case 'troupeId':
      return serializer.TroupeIdStrategy;
    case 'chat':
      return serializer.ChatStrategy;
    case 'chatId':
      return serializer.ChatIdStrategy;
  }
}

function serializeModel(model, callback) {
  return Promise.try(function() {
    if (model === null) return;
    var schema = model.schema;
    if (!schema) throw new Error("Model does not have a schema");
    if (!schema.schemaTypeName) throw new Error("Schema does not have a schema name");

    var strategy;

    switch(schema.schemaTypeName) {
      case 'UserSchema':
        strategy = new serializer.UserStrategy();
        break;

      case 'TroupeSchema':
        strategy = new serializer.TroupeStrategy();
        break;

      case 'ChatMessageSchema':
        strategy = new serializer.ChatStrategy();
        break;
    }

    if (!strategy) throw new Error("No strategy for " + schema.schemaTypeName);

    return serializer.serialize(model, strategy);
  })
  .nodeify(callback);
}

var serializer = createSerializer('notifications', {
  getStrategy: getStrategy,
  serializeModel: serializeModel,
});

module.exports = serializer;
