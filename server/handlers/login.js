/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var passport = require("passport");

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/loginfail')
}

module.exports = {
    install: function(app) {
      app.post('/login',
          passport.authenticate('local', { successRedirect: '/loginsuccess',
                                           failureRedirect: '/loginfail' })
        );

      /* Cheap trick for testing */
      app.get('/login', function(req, res) {
        res.render("login/login");
      });
      
      app.get('/loginsuccess', ensureAuthenticated, function(req, res) {
        res.send({     
          failed: false,
          user: req.user
        });
      });

      app.get('/loginfail', function(req, res) {
        res.send({ failed: true });
      });
    }
};