/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var middleware = require('../web/middleware'),
    im = require('imagemagick'),
    sechash = require('sechash'),
    mongoose = require("mongoose"),
    userService = require('../services/user-service.js'),
    restSerializer = require("../serializers/rest-serializer");

function redirectToDefault(user, res) {
  res.redirect(301, "/images/2/avatar-default.png");
}

function displayAvatarFor(userId, req, res) {
  var db = mongoose.connection.db;
  var GridStore = mongoose.mongo.GridStore;
  var avatarFile = "avatar-" + userId;
  GridStore.exist(db, avatarFile, function(err, exists) {
    if(err || !exists) return redirectToDefault(userId, res);

    var gs = new GridStore(db, avatarFile, "r");

    gs.open(function(err, gs) {
      if(err) {
        redirectToDefault(userId, res);
        return;
      }

      res.setHeader("Cache-Control","public");
      res.setHeader('ETag', gs.md5);
      res.setHeader('Vary', 'Accept');
      res.setHeader('Expires', new Date(Date.now() + 365 * 86400 * 1000));

      var presentedEtag = req.get('If-None-Match');
      if(!presentedEtag || presentedEtag !== gs.md5) {
        gs.stream(true).pipe(res);
        return;
      }

      res.send(304);
    });

  });
}

module.exports = {
    install: function(app) {
      app.get(
        '/avatar',
        middleware.ensureLoggedIn(),
        function(req, res) {
          displayAvatarFor(req.user.id, req, res);
        }
      );

      app.get(
        '/avatar/:userId',
        // middleware.ensureLoggedIn(),
        function(req, res, next) {
          var userId = req.params.userId;
          displayAvatarFor(userId, req, res);
        }
      );

      app.get(
        '/avatar/:userId/:version.:type',
        // middleware.ensureLoggedIn(),
        function(req, res, next) {
          /* Ignore the version and always serve up the latest */
          var userId = req.params.userId;
          displayAvatarFor(userId, req, res);
        }
      );

      app.post(
        '/avatar',
        middleware.ensureLoggedIn(),
        function(req, res, next) {
          var file = req.files.file;
          var inPath = file.path;
          var resizedPath = file.path + "-small.jpg";

          im.convert(['-define','jpeg:size=48x48',inPath,'-thumbnail','48x48^','-gravity','center','-extent','48x48',resizedPath],
            function(err, stdout, stderr) {
              if (err) return next(err);

              var db = mongoose.connection.db;
              var GridStore = mongoose.mongo.GridStore;
              var gs = new GridStore(db, "avatar-" + req.user.id, "w", {
                  "content_type": "image/jpeg",
                  "metadata":{
                    /* Attributes go here */
                  }
              });

              gs.writeFile(resizedPath, function(err) {
                if (err) return next(err);

                req.user.avatarVersion = req.user.avatarVersion ? req.user.avatarVersion + 1 : 1;
                req.user.save();

                var strategy = new restSerializer.UserStrategy();

                restSerializer.serialize(req.user, strategy, function(err, serialized) {
                  if(err) return next(err);

                  res.send({
                      success: true,
                      user: serialized
                  });
                });
              });
            });
        }
      );
    }
};
