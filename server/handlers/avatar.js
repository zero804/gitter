/*jshint globalstrict:true, trailing:false unused:true node:true*/
/*global console:false, require: true, module: true */
"use strict";

var middleware = require('../web/middleware'),
    im = require('imagemagick'),
    sechash = require('sechash'),
    mongoose = require("mongoose"),
    userService = require('../services/user-service.js'),
    restSerializer = require("../serializers/rest-serializer"),
    Fiber = require("../utils/fiber");

function redirectToDefault(size, user, res) {
  res.redirect(301, "/images/2/avatar-default.png");
}

// size is either 's' or 'm'
function displayAvatarFor(size, userId, req, res) {
  var db = mongoose.connection.db;
  var GridStore = mongoose.mongo.GridStore;

  var avatarFile = "avatar-" + userId + ((size == 'm') ? '-m' : '');

  GridStore.exist(db, avatarFile, function(err, exists) {
    if(err || !exists) return redirectToDefault(size, userId, res);

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

function scaleAndWriteAvatar(width, height, path, callback) {
  var saveToPath = path + '-' + width + 'x' + height;

  im.convert(['-define','jpeg:size='+width+'x'+height+'48',path,'-thumbnail',width+'x'+height+'^','-gravity','center','-extent',width+'x'+height,saveToPath],
    function(err, stdout, stderr) {
      if (err) {
        return callback(err);
      } else {
        return callback(saveToPath);
      }
    }
  );
}

function saveAvatarToGridFS(localPath, gridFSFilename, callback) {
  var db = mongoose.connection.db;
  var GridStore = mongoose.mongo.GridStore;
  var gs = new GridStore(db, gridFSFilename, "w", {
      "content_type": "image/jpeg",
      "metadata":{
        /* Attributes go here */
      }
  });

  gs.writeFile(localPath, callback);
}

module.exports = {
    install: function(app) {
      app.get(
        '/avatar',
        middleware.ensureLoggedIn(),
        function(req, res) {
          displayAvatarFor('s', req.user.id, req, res);
        }
      );

      app.get(
        '/avatar/:userId',
        // middleware.ensureLoggedIn(),
        function(req, res, next) {
          var userId = req.params.userId;
          displayAvatarFor('s', userId, req, res);
        }
      );

      app.get(
        '/avatar/:size/:userId/:version.:type',
        // middleware.ensureLoggedIn(),
        function(req, res, next) {
          /* Ignore the version and always serve up the latest */
          var userId = req.params.userId;
          var size = req.params.size;
          displayAvatarFor(size, userId, req, res);
        }
      );

      app.post(
        '/avatar',
        middleware.ensureLoggedIn(),
        function(req, res, next) {
          var file = req.files.file;
          var inPath = file.path;
          var resizedPath = file.path + "-.jpg";
          var mongoPath = "avatar-" + req.user.id;

          var fiber = new Fiber();

          scaleAndWriteAvatar(48, 48, inPath, function(resizedPath) {
            saveAvatarToGridFS(resizedPath, 'avatar-' + req.user.id, fiber.waitor());
          });

          scaleAndWriteAvatar(180, 180, inPath, function(resizedPath) {
            saveAvatarToGridFS(resizedPath, 'avatar-' + req.user.id + '-m', fiber.waitor());
          });


          fiber.sync()
            .then(function() {
              //if (err) return next(err);

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
            })
            .fail(function(err) {
              next(err);
            });
        }
      );
    }
};
