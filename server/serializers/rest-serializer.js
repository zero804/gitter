"use strict";

var Promise          = require('bluebird');
var createSerializer = require('./create-serializer');

// TODO: deprecate this....
function getStrategy(modelName) {
  switch(modelName) {
    case 'chat':
      return serializer.ChatStrategy;
    case 'chatId':
      return serializer.ChatIdStrategy;
    case 'troupe':
      return serializer.TroupeStrategy;
    case 'troupeId':
      return serializer.TroupeIdStrategy;
    case 'user':
      return serializer.UserStrategy;
  }
}

function serializeModel(model, callback) {
  return Promise.try(function() {
      if(model === null) return;

      var schema = model.schema;
      if(!schema) throw new Error("Model does not have a schema");
      if(!schema.schemaTypeName) throw new Error("Schema does not have a schema name");

      var strategy;

      switch(schema.schemaTypeName) {
        case 'UserSchema':
          strategy = new serializer.UserStrategy();
          break;

        case 'TroupeSchema':
          strategy = new serializer.TroupeStrategy();
          break;

        case 'TroupeUserSchema':
          strategy = new serializer.TroupeUserStrategy();
          break;

        case 'TroupeBanStrategy':
          strategy = new serializer.TroupeBanStrategy();
          break;

        case 'ChatMessageSchema':
          strategy = new serializer.ChatStrategy();
          break;

        case 'EventSchema':
          strategy = new serializer.EventStrategy();
          break;

      }

      if(!strategy) throw new Error("No strategy for " + schema.schemaTypeName);

      return serializer.serialize(model, strategy);
    })
    .nodeify(callback);
}

var serializer = createSerializer('rest', {
  getStrategy: getStrategy,
  serializeModel: serializeModel,
});


module.exports = serializer;
