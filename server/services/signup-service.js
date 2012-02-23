var persistence = require("./persistence-service"),
    mailerService = require("./mailer-service");

module.exports = {
    newSignup: function(options) {
      var user = new persistence.User();
      user.email = options.email;
      
      user.save(function (err) {
        if(err == null) {
          var troupe = new persistence.Troupe();
          troupe.name = options.troupeName;
          troupe.save(function(err) {
            if(err == null) {
              mailerService.sendEmail({
                templateFile: "signupemail",
                to: user.email,
                subject: "Welcome to troupe",
                data: {
                  troupeName: options.troupeName
                }
              });
              
              if(options.onSuccess) options.onSuccess();  
              
            } else {
              if(options.onFailure) options.onFailure(err);
            }
          });
          
        } else {
        }
      });
    }
};