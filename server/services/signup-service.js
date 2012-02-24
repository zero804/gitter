var persistence = require("./persistence-service"),
    mailerService = require("./mailer-service"),
    uuid = require('node-uuid');

function createUniqueUri() {
  var chars = "0123456789abcdefghiklmnopqrstuvwxyz";

  var uri = "";
  for(var i = 0; i < 6; i++) {
    var rnum = Math.floor(Math.random() * chars.length);
    uri += chars.substring(rnum, rnum + 1);
  }
  
  return uri;
}

module.exports = {
    newSignup: function(options) {
      var confirmationCode = uuid.v4();
      
      var user = new persistence.User();
      user.email = options.email;
      user.confirmationCode = confirmationCode;
      
      var confirmLink = "http://trou.pe/confirm/" + confirmationCode;
      var uri = createUniqueUri();

      console.log("confirmLink is " + confirmLink);
      
      user.save(function (err) {
        if(err == null) {
          var troupe = new persistence.Troupe();
          troupe.name = options.troupeName;
          troupe.uri = uri;
          
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
    },
    
  confirm: function(confirmationCode, callbackFunction) {
    persistence.User.findOne({confirmationCode: confirmationCode}, function(err, user) {
      if(err) {
        callbackFunction(err, null);
        return;
      }
      
      if(user == null) {
        callbackFunction(new Error("No user found for given confirmation code: " + confirmationCode), null);
        return;
      }
      
      user.confirmationCode = null;
      user.status = 'ACTIVE';
      
      user.save(function(err) {
        callbackFunction(err, user);
      });
    });
  }  
};