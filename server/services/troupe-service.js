"use strict";

var persistence = require("./persistence-service"),
    userService = require("./user-service"),
    mailerService = require("./mailer-service"),
    uuid = require('node-uuid');
    
function findByUri(uri, callback) {
  persistence.Troupe.findOne({uri: uri}, function(err, troupe) {
    callback(err, troupe);
  });
}

function findById(id, callback) {
  persistence.Troupe.findById(id, function(err, troupe) {
    callback(err, troupe);
  });
}

function userHasAccessToTroupe(user, troupe) {
  return troupe.users.indexOf(user.id) >=  0;
}

function validateTroupeEmail(options, callback) {
  var from = options.from;
  var to = options.to;
  
  /* TODO: Make this email parsing better! */
  var uri = to.split('@')[0];
  var user = null;
  var troupe = null;
  console.log("Options: " + JSON.stringify(options));
  
  userService.findByEmail(from, function(err, fromUser) {
    if(err) return callback(err);
    if(!fromUser) return callback("Access denied");
        console.log("fromUser: " + JSON.stringify(fromUser));
    
    findByUri(uri, function(err, troupe) {
      if(err) return callback(err);
      if(!troupe) return callback("Troupe not found for uri " + uri);
      if(!userHasAccessToTroupe(fromUser, troupe)) {
        callback("Access denied");
      } 

      callback(null,troupe);
          
    });
  });
  
}

function addInvite(troupe, displayName, email) {
  var code = uuid.v4();
  
  var invite = new persistence.Invite();
  invite.troupeId = troupe.id;
  invite.displayName = displayName;
  invite.email = email;
  invite.code = code;
  invite.save();
  
  var acceptLink = "http://trou.pe/accept/" + code;
  
  mailerService.sendEmail({
    templateFile: "inviteemail",
    to: email,
    subject: "You been invited to join the " + troupe.name + " troupe",
    data: {
      displayName: displayName,
      troupeName: troupe.name,
      acceptLink: acceptLink
    }
  });
  
}

function findInviteByCode(code, callback) {
  persistence.Invite.findOne({code: code}, function(err, invite) {
    callback(err, invite);
  });
}

function acceptInvite(code, user, callback) {
  findInviteByCode(code, function(err, invite) {
    if(err) return callback(err);
    if(!invite) return callback(new Error("Invite code not found"));
    
    findById(invite.troupeId, function(err, troupe) {
      if(err) return callback(err);
      if(!troupe) return callback(new Error("Cannot find troupe referenced by invite."));

      if(invite.status != 'UNUSED') {
        return callback(new Error("Invitation has already been used."));
      }
      
      invite.status = 'USED';
      invite.save();
      
      troupe.users.push(user.id);
      troupe.save(function(err) {
        if(err) return callback(err);
        return callback(null, troupe);
      });
      
    });
    
  });
}

function storeEmail(options, callback) {
  var fromEmail = options.fromEmail;
  var troupeId = options.troupeId;
  var subject = options.subject;
  var date = options.date;
  var fromName = options.fromName;
  var mailBody = options.mailBody;
  var preview = options.preview;
  
  var storeMail = new persistence.Email();
      
  storeMail.from = fromEmail;
  storeMail.troupeId = troupeId;
  storeMail.subject = subject;
  storeMail.date = date;
  storeMail.fromName = fromName;
  storeMail.mail = mailBody;
  storeMail.preview = preview;
  storeMail.delivered = false;
  
  storeMail.save(function(err) {
      if (err) return callback(err);
      callback(null);
  });
}

module.exports = {
  findByUri: findByUri,
  findById: findById,
  validateTroupeEmail: validateTroupeEmail,
  userHasAccessToTroupe: userHasAccessToTroupe,
  addInvite: addInvite,
  findInviteByCode: findInviteByCode,
  acceptInvite: acceptInvite,
  storeEmail: storeEmail
};