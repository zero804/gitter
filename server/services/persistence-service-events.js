/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var env            = require('gitter-web-env');
var logger         = env.logger;
var Q              = require('q');
var debug          = require('debug')('gitter:persistence-service-events');
var appEvents      = require('gitter-web-appevents');
var restSerializer = require("../serializers/rest-serializer");

// --------------------------------------------------------------------
// Utility serialization stuff
// --------------------------------------------------------------------

// TODO: move this into its own module
function serializeEvent(url, operation, model, callback) {
  if(!url) { return Q.resolve().nodeify(callback); }

  debug("Serializing %s to %s", operation, url);

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

      return serializedModel;
    })
    .nodeify(callback);
}
exports.serializeEvent = serializeEvent;

exports.install = function(persistenceService) {

  var schemas = persistenceService.schemas;
  var mongooseUtils = require("../utils/mongoose-utils");
  var presenceService = require('./presence-service');

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

  function serializeTroupeEventForUsers(troupeUsers, operation, model, next) {
    var userIds = troupeUsers.map(function(troupeUser) { return troupeUser.userId; });

    return presenceService.categorizeUsersByOnlineStatus(userIds)
      .then(function(online) {
        var urls = userIds.filter(function(userId) {
            return !!online[userId];
          }).map(function(userId) {
            return '/user/' + userId + '/rooms';
          });

        serializeEvent(urls, operation, model);
      })
      .catch(function(err) {
        logger.error('Error while serializing non-oneToOne troupe: ' + err, { exception: err });
      })
      .finally(function() {
        if(next) next();
      });

  }

  mongooseUtils.attachNotificationListenersToSchema(schemas.TroupeSchema, {
    ignoredPaths: ['bans', 'githubId'],
    onCreate: function onTroupeCreate(model, next) {
      if(model.oneToOne) {
        // Because the troupe needs the currentUserId to be set!
        serializeOneToOneTroupe('create', model);
        return next();
      }

      serializeTroupeEventForUsers(model.users, 'create', model, next);
    },

    onUpdate: function onTroupeUpdate(model, next) {
      if (model.modifiedPaths().length === 0) {
        debug('Skipping update, not modified paths');
        return next();
      }

      if(model.oneToOne) {
        // Because the troupe needs the
        serializeOneToOneTroupe('update', model);
        return next();
      }

      serializeTroupeEventForUsers(model.users, 'update', model, next);
    },

    onRemove: function onTroupeRemove(model) {
      if(model.oneToOne) {
        // Because the troupe needs the
        serializeOneToOneTroupe('remove', model);
        return;
      }

      serializeTroupeEventForUsers(model.users, 'remove', model);
    }
  });


};
