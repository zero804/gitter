/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var middleware = require('./middleware'),
    im = require('imagemagick'),
    sechash = require('sechash'),
    mongoose = require("mongoose"),
    userService = require('../services/user-service.js');

function redirectToDefault(user, res) {
  res.redirect("/images/2/avatar-default.png");
}

function displayAvatarFor(user, res) {
  if(user.avatarUrlSmall) {
    return res.redirect(user.avatarUrlSmall);
  }

  var db = mongoose.connection.db;
  var GridStore = mongoose.mongo.GridStore;
  var avatarFile = "avatar-" + user.id;
  GridStore.exist(db, avatarFile, function(err, exists) {
    if(err || !exists) return redirectToDefault(user, res);

    var gs = new GridStore(db, avatarFile, "r");
    gs.open(function(err, gs) {
      if(err) {
        redirectToDefault(user, res);
        return;
      }

      gs.stream(true).pipe(res);
    });

  });
}

module.exports = {
    install: function(app) {
      app.get(
        '/avatar',
        middleware.ensureLoggedIn,
        function(req, res) {
          displayAvatarFor(req.user, res);
        }
      );

      app.get(
        '/avatar/:userId',
        middleware.ensureLoggedIn,
        function(req, res) {
          var userId = req.params.userId;
          userService.findById(userId, function(err, user) {
            if(err) return res.send(500);
            if(!user) return res.send(404);

            displayAvatarFor(user, res);


          });

        }
      );

      app.post(
        '/avatar',
        middleware.ensureLoggedIn,
        function(req, res, next) {
          var file = req.files.files;
          var inPath = file.path;
          var resizedPath = file.path + "-small.jpg";

          im.convert(['-define','jpeg:size=48x48',inPath,'-thumbnail','48x48^','-gravity','center','-extent','48x48',resizedPath], 
            function(err, stdout, stderr) {
              if (err) return res.send(500);

              var db = mongoose.connection.db;
              var GridStore = mongoose.mongo.GridStore;
              var gs = new GridStore(db, "avatar-" + req.user.id, "w", {
                  "content_type": "image/jpeg",
                  "metadata":{
                    /* Attributes go here */
                  }
              });

              gs.writeFile(resizedPath, function(err) {
                if (err) return res.send(500);

                /* If we've pushed the avatar to a CDN, get rid of it */
                if(req.user.avatarUrlSmall) {
                  req.user.avatarUrlSmall = null;
                  req.user.save();
                }

                res.send({ success: true });
              });
            });
        }
      );
    }
};
