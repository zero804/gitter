/*jshint globalstrict:true, trailing:false unused:true node:true*/
"use strict";

exports.install = function(persistenceService) {

  var schemas = persistenceService.schemas;
  var appEvents = require("../app-events");
  var mongooseUtils = require("../utils/mongoose-utils");
  var winston = require("winston");
  var troupeService = require("./troupe-service");
  var restSerializer =  require("../serializers/rest-serializer");

  // --------------------------------------------------------------------
  // Utility serialization stuff
  // --------------------------------------------------------------------

  function serializeEvent(url, operation, model, callback) {
    winston.debug("Serializing " + operation + " to " + url);

    restSerializer.serializeModel(model, function(err, serializedModel) {
      if(err) {
        winston.error("Silently failing model event: ", { exception: err, url: url, operation: operation });
      } else {
        appEvents.dataChange2(url, operation, serializedModel);
      }

      if(callback) callback();
    });
  }

  /** */
  function attachNotificationListenersToSchema(schema, name, extractor) {

    if(!extractor) {
      // Default extractor
      extractor = function(model) {
        return "/troupes/" + model.troupeId + "/" + name + "s";
      };
    }

    mongooseUtils.attachNotificationListenersToSchema(schema, {
      onCreate: function(model, next) {
        var url = extractor(model);
        serializeEvent(url, 'create', model);
        next();
      },

      onUpdate: function(model, next) {
        var url = extractor(model);
        serializeEvent(url, 'update', model);
        next();
      },

      onRemove: function(model) {
        var url = extractor(model);
        serializeEvent(url, 'remove', model);
      }
    });
  }

  mongooseUtils.attachNotificationListenersToSchema(schemas.UserSchema, {

    onUpdate: function(model, next) {
      if(!next) next = function() {};

      troupeService.findAllTroupesIdsForUser(model.id, function(err, troupeIds) {
        if(err) { winston.error("Silently ignoring error in user update ", { exception: err }); return next(); }
        if(!troupeIds) return next();

        restSerializer.serializeModel(model, function(err, serializedModel) {
          if(err) { winston.error("Silently failing user update: ", { exception: err }); return next(); }

          troupeIds.forEach(function(troupeId) {
            var url = "/troupes/" + troupeId + "/users";
            appEvents.dataChange2(url, "update", serializedModel);
          });

          next();
        });
      });
    }

    // TODO: deal with user deletion!
  });

  attachNotificationListenersToSchema(schemas.ConversationSchema, 'conversation');
  attachNotificationListenersToSchema(schemas.FileSchema, 'file');
  attachNotificationListenersToSchema(schemas.InviteSchema, 'invite');
  attachNotificationListenersToSchema(schemas.RequestSchema, 'request');
  //attachNotificationListenersToSchema(NotificationSchema, 'notification');
  attachNotificationListenersToSchema(schemas.ChatMessageSchema, 'chat', function(model) {
    return "/troupes/" + model.toTroupeId + "/chatMessages";
  });
  attachNotificationListenersToSchema(schemas.TroupeSchema, 'troupe', function(model) {
    return "/troupes/" + model.id;
  });

};