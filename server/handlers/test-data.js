/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var nconf = require('../utils/config');

if(!nconf.get('test:exposeDataForTestingPurposes')) {
  module.exports = { install: function() {} };
  return;
}

// This would be very insecure in a production environment, but we do it in testing to aid our
// testing processes

var userService = require("../services/user-service");
var persistence = require('../services/persistence-service');
var winston = require('winston');

winston.warn('Warning: confidential data is being exposed for testing purposes!');

module.exports = {
  install: function(app) {
    app.get('/testdata/confirmationCodeForEmail', function(req, res/*, next */) {
      var forEmail = req.body.email || req.query.email;

      userService.findByEmail(forEmail, function(e, user) {
        if (e || !user) return res.send(404, "No user with that email signed up.");

        res.send(user.confirmationCode);
      });
    });


    app.get('/testdata/confirmationLink', function(req, res, next) {

      persistence.User.findOne({ email:  req.query.email }, function(err, user) {
        if(err) return next(err);
        if(!user) return next(404);

        userService.findDefaultTroupeForUser(user.id, function(err, troupe) {
          if(err) return next(err);
          if(!troupe) return next(404);

          res.send("/" + troupe.uri + "/confirm/" + user.confirmationCode);
        });

      });
    });

    app.get('/testdata/inviteAcceptLink', function(req, res, next) {

      console.log("EMAIL:",req.query.email);
      persistence.Invite.findOne({ email: req.query.email }, null, { sort: { '_id': -1 } }, function(err, invite) {
        if(err) return next(err);
        if(!invite) return next(404);

        persistence.Troupe.findById(invite.troupeId, function(err, troupe) {
          if(err) return next(err);
          if(!invite) return next(404);

          res.send("/" + troupe.uri + "/accept/" + invite.code);
        });
      });

    });

    app.get('/testdata/inviteAcceptLinkByUserId', function(req, res, next) {

      userService.findById(req.query.userId, function(err, user) {
        if(err) return next(err);
        if(!user) return next("User not found");

        res.redirect('/testdata/inviteAcceptLink?email='+user.email);

      });
    });

    app.get('/testdata/oneToOneLink', function(req, res, next) {
      persistence.User.findOne({ email:  req.query.email }, function(err, user) {
        if(err) return next(err);
        if(!user) return next(404);

        res.send("/one-one/" + user.id);
      });
    });

  }
};
