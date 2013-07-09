/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var middleware = require('../web/middleware'),
    im = require('imagemagick'),
    crypto = require('crypto'),
    assert = require('assert'),
    mongoose = require("mongoose"),
    restSerializer = require("../serializers/rest-serializer"),
    userService = require('../services/user-service'),
    Fiber = require("../utils/fiber");

function redirectToDefault(size, userId, res) {
  // only used as a safety catch when accessing the version urls,
  // which should never be accessed when a default image is required.
  var s = (size == 'm') ? '-m' : '-s';

  userService.findById(userId, function(err, user) {
    if (user)
      res.redirect(301, "https://www.gravatar.com/avatar/" + crypto.createHash('md5').update(user.email).digest('hex') + "?d=identicon");
    else
      res.redirect(301, "/images/2/avatar-default"+s+".png");
  });
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
        redirectToDefault(size, userId, res);
        return;
      }

      var eTag = gs.md5;
      res.setHeader("Cache-Control","public");
      res.setHeader('ETag', eTag);
      res.setHeader('Vary', 'Accept');
      res.setHeader('Expires', new Date(Date.now() + 365 * 86400 * 1000));

      var presentedEtag = req.get('If-None-Match');
      if(!presentedEtag || presentedEtag !== eTag) {
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
    function(err/*, stdout, stderr*/) {
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
      app.get('/avatarForEmail/:email', function(req, res, next) {
        var email = req.params.email;
        assert(email, "An email address must be provided in the url");
        userService.findByEmail(email, function(err, user) {
          if (err) return next(err);
          if (!user) {
            return res.redirect("https://www.gravatar.com/avatar/" + crypto.createHash('md5').update(email).digest('hex') + "?d=identicon");
          }

          displayAvatarFor('s', user.id, req, res);
        });
      });

      app.get(
        '/avatar',
        middleware.ensureLoggedIn(),
        function(req, res) {
          displayAvatarFor('s', req.user.id, req, res);
        }
      );

      app.get(
        '/avatar/:userId',
        function(req, res) {
          var userId = req.params.userId;
          displayAvatarFor('s', userId, req, res);
        }
      );

      app.get('/gravatar/:email', function(req, res) {
        var email = req.params.email;
        assert(email, "An email address must be provided in the url");
        res.redirect("https://www.gravatar.com/avatar/" + crypto.createHash('md5').update(email).digest('hex') + "?d=identicon");
      });

      app.get(
        '/avatar/:size/:userId/:version.:type',
        function(req, res) {

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
          var file = req.files.qqfile;
          var inPath = file.path;
          var mongoPath = "avatar-" + req.user.id;

          var fiber = new Fiber();
          // note: create the waitors now so that they aren't created in callbacks
          // (which are only after the sync function is run).
          var waitor1 = fiber.waitor();
          var waitor2 = fiber.waitor();

          scaleAndWriteAvatar(48, 48, inPath, function(resizedPath) {
            saveAvatarToGridFS(resizedPath, 'avatar-' + req.user.id, waitor1);
          });

          scaleAndWriteAvatar(180, 180, inPath, function(resizedPath) {
            saveAvatarToGridFS(resizedPath, 'avatar-' + req.user.id + '-m', waitor2);
          });


          fiber.sync()
            .then(function() {

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
