var signupService = require("../services/signup-service");

module.exports = {
    install: function(app) {
      app.get('/confirm', function(req, res) {
        res.render('confirm', {
        });
      });
      
      app.get('/confirm/:confirmationCode', function(req, res, next){
        signupService.confirm(req.params.confirmationCode, function(err, user) {
          if (err) return next(err);
          
          req.session.user = {
              id: user._id
          };
          
          console.log(JSON.stringify(req.session.user));
          
          res.redirect('/profile');
        });
      });
      
    }
};