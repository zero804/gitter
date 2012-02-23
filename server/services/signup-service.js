var persistence = require("./persistence-service"),
    mailerService = require("./mailer-service"),
    uuid = require('node-uuid');


module.exports = {
    newSignup: function(options) {
      var confirmationCode = uuid.v4();
      
      var user = new persistence.User();
      user.email = options.email;
      user.confirmationCode = confirmationCode;
      
      var confirmLink = "http://trou.pe/confirm/" + confirmationCode;

      console.log("confirmLink is " + confirmLink);
      
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
                  troupeName: options.troupeName,
                  confirmLink: confirmLink
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