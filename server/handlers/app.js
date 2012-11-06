/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var troupeService = require("../services/troupe-service");
var winston = require("../utils/winston");
var userService = require("../services/user-service");
var unreadItemService = require("../services/unread-item-service");
var restSerializer = require("../serializers/rest-serializer");
var nconf = require('../utils/config').configure();
var Q = require("q");

module.exports = {
    install: function(app) {
      app.get('/:appUri', function(req, res, next) {
        var appUri = req.params.appUri;

        var unreadCountDeferred = Q.defer();
        var troupeLoadDeferred = Q.defer();

        troupeService.findByUri(appUri, function(err, troupe) {
          if(err) return next(err);
          if(!troupe) return next("Troupe: " + appUri + " not found.");

          if(req.user) {
            unreadItemService.getUnreadItemsForUser(req.user.id, troupe.id, function(err, unreadItems) {
              if(err) return next(err);
              serializeUserAndRenderPage(unreadItems);
            });

          } else {
            serializeUserAndRenderPage(null);
          }

          function serializeUserAndRenderPage(unreadItems) {
            if(!req.user) return renderPage(unreadItems, null);

            var strategy = new restSerializer.UserStrategy();

            restSerializer.serialize(req.user, strategy, function(err, serialized) {
              if(err) return next(err);

              renderPage(unreadItems, serialized);
            });

          }

          function renderPage(unreadItems, serializedUser) {
            var profileNotCompleted;

            var troupeData = {
              "uri": troupe.uri,
              "id": troupe.id,
              "name": troupe.name
            };
            var accessDenied;

            if(req.user) {
              if(!troupeService.userHasAccessToTroupe(req.user, troupe)) {
                accessDenied = true;
                troupeData = null;
              }

              profileNotCompleted = req.user.status == 'PROFILE_NOT_COMPLETED';
            } else {
              troupeData = null;
            }

            var troupeContext = {
                user: serializedUser,
                troupe: troupeData,
                profileNotCompleted: profileNotCompleted,
                unreadItems: unreadItems,
                accessDenied: accessDenied,
                websockets: {
                  nowjs: nconf.get('ws:nowjsUrl')
                }

            };

            var page;
            if(req.headers['user-agent'].indexOf('Mobile') >= 0) {
              page = 'app';
            } else {
              page = 'app';
            }

            var login, troupeName;
            if(req.user && !profileNotCompleted && troupeData) {
              login  = false;
              troupeName = troupe.name;

              userService.saveLastVisitedTroupeforUser(req.user.id, troupe.id, function(err) {
                if (err) winston.info("Something went wrong saving the user last troupe visited: " + err);
              });

            } else {
              login = true;
              if(profileNotCompleted) {
                troupeName = troupe.name;
              } else {
                troupeName = "Welcome";
              }
            }

            res.render(page, {
              login: login,
              troupeName: troupeName,
              troupeContext: JSON.stringify(troupeContext)
            });

          }

        });

      });

      app.get('/:appUri/accessdenied', function(req, res, next) {
        res.render('app-accessdenied', {
        });
      });
    }
};