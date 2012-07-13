/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var passport = require("passport"),
    winston = require("winston");
var nconf = require('../utils/config').configure(),
    troupeService = require("../services/troupe-service"),
    rememberMe = require('../utils/rememberme-middleware'),
    middleware = require('./middleware');
var userService = require('../services/user-service');

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.relativeRedirect('/loginfail');
}

module.exports = {
    install: function(app) {
      var basepath = nconf.get("web:basepath");

      app.post('/login',
        passport.authenticate('local', { failureRedirect: basepath + '/login' }),
        function(req, res) {
          function sendAffirmativeResponse() {
            if(req.accepts('application/json')) {
              userService.findDefaultTroupeForUser(req.user.id, function (err,troupe) {
                if (err) troupe = null;
                res.send({
                  failed: false,
                  user: req.user, 
                  defaultTroupe: troupe
                });
              });

              
            } else {
              res.relativeRedirect('/select-troupe');
            }
          }

          if(req.body.rememberMe) {
            rememberMe.generateAuthToken(req, res, req.user.id, {}, function(err) {
              if(err) winston.error(err);
              sendAffirmativeResponse();
            });
          } else {
            sendAffirmativeResponse();
          }
        });

      app.get('/login', function(req, res) {
        if(req.accepts('application/json')) {
          res.send({ failed: true });
        } else {
          res.render('login', {
          });
        }
      });


      app.get('/select-troupe', 
        middleware.ensureLoggedIn,
        function(req, res) {
        troupeService.findAllTroupesForUser(req.user.id, function(err, troupes) {
          if (err) return res.send(500);

          res.render('select-troupe', {
            troupes: troupes
          });
        });


      });

    }
};