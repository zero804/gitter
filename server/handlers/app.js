var signupService = require("../services/signup-service");

module.exports = {
    install: function(app) {
      app.get('/app', function(req, res) {
        var troupeContext = req.session.user ? JSON.stringify(req.session.user) : "null";
        
        res.render('app', {
          troupeContext: troupeContext
        });
      });
    }
};