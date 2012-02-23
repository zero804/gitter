var signupService = require("../services/signup-service");

module.exports = {
    install: function(app) {
      app.get('/confirm', function(req, res) {
        res.render('confirm', {
        });
      });
      
      app.get('/confirm/:confirmationCode', function(req, res, next){
        signupService.confirm(req.params.confirmationCode, function(result, err) {
          if (err) return next(err);
          res.send(req.params.confirmationCode);
        });
      });
      
    }
};