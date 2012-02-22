var form = require("express-form"),
    filter = form.filter,
    validate = form.validate;

module.exports = {
    install: function(app) {
      app.post(
        '/signup',

        // Form filter and validation middleware
        form(
          filter("troupeName").trim(),
          validate("troupeName").required().is(/^[a-z]+$/),
          filter("email").trim(),
          validate("email").isEmail()
        ),

        // Express request-handler now receives filtered and validated data
        function(req, res){
          if (!req.form.isValid) {
            // Handle errors
            console.log(req.form.errors);

          } else {
            // Or, use filtered form data from the form object:
            console.log("Username:", req.form.troupeName);
            console.log("Email:", req.form.email);
          }
          
          res.redirect("/confirm");
        }
      );
    }
};