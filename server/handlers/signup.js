var form = require("express-form"),
    filter = form.filter,
    validate = form.validate,
    signupService = require("../services/signup-service");

module.exports = {
    install: function(app) {
      app.get(
        '/',
        function(req, res) {
          res.render('signup');
        }
      );
      app.post(
        '/signup',

        // Form filter and validation middleware
        form(
          filter("troupeName").trim(),
          validate("troupeName").required().is(/^[a-zA-Z0-9 ]+$/),
          filter("email").trim(),
          validate("email").isEmail()
        ),

        // Express request-handler now receives filtered and validated data
        function(req, res){
          if (!req.form.isValid) {
            // TODO: Handle errors
            console.log(req.form.errors);

          } else {
            
            signupService.newSignup({
              troupeName: req.form.troupeName,
              email: req.form.email
            }, function(err) {
              if(err) {
                res.redirect("/");
                return;
              } 

              res.redirect("/confirm");
            });
            
          }
          
        }
      );
    }
};