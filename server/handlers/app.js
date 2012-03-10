var signupService = require("../services/signup-service");

module.exports = {
    install: function(app) {
      app.get('/:appCode', function(req, res) {
        var troupeContext = req.user ? JSON.stringify(req.user) : "null";
        
        res.render('app', {
          troupeContext: troupeContext
        });
      });
    }
};