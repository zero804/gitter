var persistence = require("./persistence-service"),
    mailerService = require("./mailer-service"),
    userService = require("./user-service"),
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

function newTroupeForExistingUser(options, user, callback) {
  var uri = createUniqueUri();

  var troupe = new persistence.Troupe();
  troupe.name = options.troupeName;
  troupe.uri = uri;
  
  var troupeLink = "http://trou.pe/" + uri;

  troupe.save(function(err) {
    if(err == null) {
      mailerService.sendEmail({
        templateFile: "signupemail_existing",
        to: user.email,
        subject: "You created a new Troupe",
        data: {
          troupeName: options.troupeName,
          troupeLink: troupeLink
        }
      });
      callback(null);
    }
  });
}

function newTroupeForNewUser(options, callback) {
  var confirmationCode = uuid.v4();
  var user = new persistence.User();
  user.email = options.email;
  user.confirmationCode = confirmationCode;
  
  var confirmLink = "http://trou.pe/confirm/" + confirmationCode;
  var uri = createUniqueUri();

  user.save(function (err) {
    if(err) {
      callback(err);
      return;
    }
    
    var troupe = new persistence.Troupe();
    troupe.name = options.troupeName;
    troupe.uri = uri;
    
    troupe.save(function(err) {
      if(err) {
        callback(err);
        return;
      }
      mailerService.sendEmail({
        templateFile: "signupemail",
        to: user.email,
        subject: "Welcome to Troupe",
        data: {
          troupeName: options.troupeName,
          confirmLink: confirmLink
        }
      });
      
      callback(null);
    });
  });
}

module.exports = {
  newSignup: function(options, callback) {

    // We shouldn't have duplicate users in the system, so we should:
    //     * Check if the user exists
    //     * If the user exists, have they previously confirmed their email address
    //     * If the user exists AND has a confirmed email address, create the Troupe and send a New Troupe email rather than a Welcome to Troupe email and redirect them straight to the Troupe not the confirm page.
    //     * If the user exists but hasn't previously confirmed their email - then we need to figure out something... should we resend the same confirmation code that was previously sent out or should we send a new one. Say someone creates 3 Troupes in a row, each one will generate a different confirmation code. It's the email address you are confirming not the Troupe. 
    //       

    userService.findExistingUser(options.email, function(err, user) {
      if(err) {
        callback(err, null);
        return;
      }

      if(user) {
        newTroupeForExistingUser(options, user, callback);
      } else {
        newTroupeForNewUser(options, callback);
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