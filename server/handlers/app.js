var signupService = require("../services/signup-service");

module.exports = {
    install: function(app) {
      app.get('/app', function(req, res) {
        res.render('app', {
        });
      });
    }
};