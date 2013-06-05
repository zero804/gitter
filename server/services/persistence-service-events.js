/*jshint globalstrict:true, trailing:false, unused:true, node:true */
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
    if(!url) { if(callback) callback(); return; }
    winston.verbose("Serializing " + operation + " to " + url);

    // TODO: consider swapping out the HEAVY WEIGHT restSerializer here for the
    // light weight notification-serializer as it is much more effeicent. Obviously
    // consumers of the events will need to be adapted to use objects of the new
    // shape
    restSerializer.serializeModel(model, function(err, serializedModel) {
      if(err) {
        winston.error("Silently failing model event: ", { exception: err, url: url, operation: operation });
        return;
      }

      if(Array.isArray(url)) {
        url.forEach(function(u) {
          appEvents.dataChange2(u, operation, serializedModel);
        });
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
        if(!url) return;

        serializeEvent(url, 'create', model);
        next();
      },

      onUpdate: function(model, next) {
        var url = extractor(model);
        if(!url) return;

        serializeEvent(url, 'update', model);
        next();
      },

      onRemove: function(model) {
        var url = extractor(model);
        if(!url) return;

        serializeEvent(url, 'remove', model);
      }
    });
  }

  mongooseUtils.attachNotificationListenersToSchema(schemas.UserSchema, {
    ignoredPaths: ['lastTroupe','confirmationCode','status','passwordHash','passwordResetCode'],
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
  // INVITES currently do not have live-collections
  attachNotificationListenersToSchema(schemas.InviteSchema, 'invite', function(model) {
    if(model.userId) {
      return "/user/" + model.userId + "/invites";
    }

    return null;
  });

  attachNotificationListenersToSchema(schemas.RequestSchema, 'request');
  attachNotificationListenersToSchema(schemas.ChatMessageSchema, 'chat', function(model) {
    return "/troupes/" + model.toTroupeId + "/chatMessages";
  });
  attachNotificationListenersToSchema(schemas.TroupeSchema, 'troupe', function(model) {
    // Never serialize any one-to-one troupe events as that's just silly
    if(model.oneToOne) return null;

    return "/troupes/" + model.id;
  });


  mongooseUtils.attachNotificationListenersToSchema(schemas.TroupeSchema, {
    onCreate: function(model, next) {
      var urls = model.users.map(function(troupeUser) { return '/user/' + troupeUser.userId + '/troupes'; });
      serializeEvent(urls, 'create', model);
      next();
    },

    onUpdate: function(model, next) {
      var urls = model.users.map(function(troupeUser) { return '/user/' + troupeUser.userId + '/troupes'; });
      serializeEvent(urls, 'update', model);
      next();
    },

    onRemove: function(model) {
      var urls = model.users.map(function(troupeUser) { return '/user/' + troupeUser.userId + '/troupes'; });
      serializeEvent(urls, 'remove', model);
    }
  });
};