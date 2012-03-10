var form = require("express-form"),
    filter = form.filter,
    validate = form.validate,
    signupService = require("../services/signup-service"),
    passport = require('passport');

module.exports = {
    install: function(app) {
      app.get('/profile', 
        function(req, res) {
        res.render('profile', {
          flash: req.flash
        });
      });   

      app.post(
          '/updateprofile',

          // Form filter and validation middleware
          form(
            filter("displayName").trim(),
            validate("displayName").required().is(/^[a-zA-Z \-\']+$/),
            filter("password").trim()
          ),

          // Express request-handler now receives filtered and validated data
          function(req, res, next) {
            if(!req.user) {
              return next("Not signed in")
            }
            
            if (!req.form.isValid) {
              res.render('profile', {
                flash: req.flash,
                errors: req.form.errors,
                displayName: req.form.displayName
              });
              
              return;
            }
            
            signupService.updateProfile({
              user: req.user,
              displayName: req.form.displayName,
              password: req.form.password,
            }, function(err) {
              if(err) {
                res.render('profile', {
                  flash: req.flash,
                  displayName: req.form.displayName
                });
                return;
              } 

              res.redirect("/app");
            });
          }
        );
      
    }
};