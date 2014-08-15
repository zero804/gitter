/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var env = require('../utils/env');
var logger = env.logger;
var stats = env.stats;

var appEvents = require("../app-events");
var restSerializer = require("../serializers/rest-serializer");

// --------------------------------------------------------------------
// Utility serialization stuff
// --------------------------------------------------------------------

// TODO: move this into its own module
function serializeEvent(url, operation, model, callback) {
  if(!url) { return Q.resolve().nodeify(callback); }
  logger.verbose("Serializing " + operation + " to " + url);

  // TODO: consider swapping out the HEAVY WEIGHT restSerializer here for the
  // light weight notification-serializer as it is much more effeicent. Obviously
  // consumers of the events will need to be adapted to use objects of the new
  // shape
  return restSerializer.serializeModel(model)
    .then(function(serializedModel) {
      if(Array.isArray(url)) {
        url.forEach(function(u) {
          appEvents.dataChange2(u, operation, serializedModel);
        });
      } else {
        appEvents.dataChange2(url, operation, serializedModel);
      }

      return serializedModel
    })
    .nodeify(callback);
}
exports.serializeEvent = serializeEvent;

exports.install = function(persistenceService) {

  var schemas = persistenceService.schemas;
  var mongooseUtils = require("../utils/mongoose-utils");

  /** */
  function attachNotificationListenersToSchema(schema, name, extractor) {

    if(!extractor) {
      // Default extractor
      extractor = function(model) {
        return "/rooms/" + model.troupeId + "/" + name + "s";
      };
    }

    mongooseUtils.attachNotificationListenersToSchema(schema, {
      onCreate: function onGenericCreate(model, next) {
        var url = extractor(model);
        if(!url) return;

        serializeEvent(url, 'create', model);
        next();
      },

      onUpdate: function onGenericUpdate(model, next) {
        var url = extractor(model);
        if(!url) return;

        serializeEvent(url, 'update', model);
        next();
      },

      onRemove: function onGenericRemove(model) {
        var url = extractor(model);
        if(!url) return;

        serializeEvent(url, 'remove', model);
      }
    });
  }

  mongooseUtils.attachNotificationListenersToSchema(schemas.UserSchema, {
    ignoredPaths: ['lastTroupe','confirmationCode','status','passwordHash','passwordResetCode'],
    onUpdate: function onUserUpdate(model, next) {

      persistenceService.Troupe
        .where('users.userId', model.id)
        .select('id')
        .execQ()
        .then(function(result) {
          var troupeIds = result.map(function(troupe) { return troupe.id; } );
          return troupeIds;
        })
        .nodeify(function(err, troupeIds) {
          if(err) { logger.error("Silently ignoring error in user update ", { exception: err }); return next(); }
          if(!troupeIds) return next();

          restSerializer.serializeModel(model, function(err, serializedModel) {
            if(err) { logger.error("Silently failing user update: ", { exception: err }); return next(); }

            troupeIds.forEach(function(troupeId) {
              var url = "/rooms/" + troupeId + "/users";
              appEvents.dataChange2(url, "update", serializedModel);
            });

            next();
          });
        });
    }

    // TODO: deal with user deletion!
  });

  function chatUrlExtractor(model) {
    return "/rooms/" + model.toTroupeId + "/chatMessages";
  }

  mongooseUtils.attachNotificationListenersToSchema(schemas.ChatMessageSchema, {
    onCreate: function(model, next) {
      var url = chatUrlExtractor(model);
      if(!url) return;

      serializeEvent(url, 'create', model, function(err, serializedModel) {
        // serializeEvent already reports errors, no need here
        if(err || !serializedModel) return;
        appEvents.chat('create', model.toTroupeId, serializedModel);
      });
      next();
    },

    onUpdate: function(model, next) {
      var url = chatUrlExtractor(model);
      if(!url) return;

      serializeEvent(url, 'update', model, function(err, serializedModel) {
        // serializeEvent already reports errors, no need here
        if(err || !serializedModel) return;
        appEvents.chat('update', model.toTroupeId, serializedModel);
      });
      next();
    },

    onRemove: function(model) {
      var url = chatUrlExtractor(model);
      if(!url) return;

      serializeEvent(url, 'remove', model, function(err, serializedModel) {
        // serializeEvent already reports errors, no need here
        if(err || !serializedModel) return;
        appEvents.chat('remove', model.toTroupeId, serializedModel);
      });
    }
  });

  attachNotificationListenersToSchema(schemas.EventSchema, 'event', function(model) {
    return '/rooms/' + model.toTroupeId + '/events';
  });

  function serializeOneToOneTroupe(operation, troupe) {
    troupe.users.forEach(function(troupeUser) {
      var currentUserId = troupeUser.userId;
      var url = '/user/' + troupeUser.userId + '/rooms';

      var strategy = new restSerializer.TroupeStrategy({ currentUserId: currentUserId });



      restSerializer.serialize(troupe, strategy, function(err, serializedModel) {
        if(err) return logger.error('Error while serializing oneToOne troupe: ' + err, { exception: err });

        appEvents.dataChange2(url, operation, serializedModel);
      });

    });
  }

  mongooseUtils.attachNotificationListenersToSchema(schemas.TroupeSchema, {
    onCreate: function onTroupeCreate(model, next) {
      if(model.oneToOne) {
        // Because the troupe needs the currentUserId to be set!
        serializeOneToOneTroupe('create', model);
        return next();
      }

      var urls = model.users.map(function(troupeUser) { return '/user/' + troupeUser.userId + '/rooms'; });
      serializeEvent(urls, 'create', model);
      next();
    },

    onUpdate: function onTroupeUpdate(model, next) {
      if(model.oneToOne) {
        // Because the troupe needs the
        serializeOneToOneTroupe('update', model);
        return next();
      }

      var urls = model.users.map(function(troupeUser) { return '/user/' + troupeUser.userId + '/rooms'; });
      serializeEvent(urls, 'update', model);
      next();
    },

    onRemove: function onTroupeRemove(model) {
      if(model.oneToOne) {
        // Because the troupe needs the
        serializeOneToOneTroupe('remove', model);
        return;
      }

      var urls = model.users.map(function(troupeUser) { return '/user/' + troupeUser.userId + '/rooms'; });
      serializeEvent(urls, 'remove', model);
    }
  });


};
