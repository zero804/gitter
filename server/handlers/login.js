/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var passport = require("passport");
var nconf = require('../utils/config').configure(),
    troupeService = require("../services/troupe-service");

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
          if(req.accepts('application/json')) {
            res.send({
              failed: false,
              user: req.user
            });
          } else {
            res.relativeRedirect('/select-troupe');
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


      app.get('/select-troupe', function(req, res) {

        troupeService.findAllTroupesForUser(req.user.id, function(err, troupes) {
          if (err) return res.send(500);

          res.render('select-troupe', {
            troupes: troupes
          });
        });


      });

    }
};