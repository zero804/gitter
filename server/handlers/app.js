var troupeService = require("../services/troupe-service");

module.exports = {
    install: function(app) {
      app.get('/:appUri', function(req, res, next) {
        var appUri = req.params.appUri;
        
        troupeService.findByUri(appUri, function(err, troupe) {
          if(err) return next(err); 
          if(!troupe) return next("Troupe: " + appUri + " not found.");
          
          var troupeContext = {
              user: req.user,
              troupe: {
                "uri": troupe.uri,
                "name": troupe.name
              }
          };
          
          res.render('app', {
            troupeContext: JSON.stringify(troupeContext)
          });
          
        });
        
      });
    }
};