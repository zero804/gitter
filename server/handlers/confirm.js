var signupService = require("../services/signup-service"),
passport = require('passport');

module.exports = {
    install: function(app) {
      app.get('/confirm', function(req, res) {
        res.render('confirm', {
        });
      });
      
      app.get('/confirm/:confirmationCode',         
        passport.authenticate('confirm'),
        function(req, res, next){
          console.dir(req.user);
          signupService.confirm(req.user, function(err, user) {
            if (err) return next(err);
            res.redirect('/profile');
          });
        }
      );
      
    }
};