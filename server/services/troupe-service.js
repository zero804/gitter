/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var persistence = require("./persistence-service"),
    userService = require("./user-service"),
    emailNotificationService = require("./email-notification-service"),
    mailerService = require("./mailer-service"),
    uuid = require('node-uuid'),
    nconf = require('../utils/config'),
    winston = require("winston");

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

function findMemberEmails(id, callback) {
  findById(id, function(err,troupe) {
    if(err) callback(err);
    if(!troupe) callback("No troupe returned");

    var userIds = troupe.users;

    userService.findByIds(userIds, function(err, users) {
      if(err) callback(err);
      if(!users) callback("No users returned");

      var emailAddresses = users.map(function(item) { return item.email; } );

      callback(null, emailAddresses);
    });

  });
}

function findAllTroupesForUser(userId, callback) {
  persistence.Troupe
    .where('users', userId)
    .sort({ name: 'asc' })
    .slaveOk()
    .exec(callback);
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

  userService.findByEmail(from, function(err, fromUser) {
    if(err) return callback(err);
    if(!fromUser) return callback("Access denied");

    findByUri(uri, function(err, troupe) {
      if(err) return callback(err);
      if(!troupe) return callback("Troupe not found for uri " + uri);

      if(!userHasAccessToTroupe(fromUser, troupe)) {
        return callback("Access denied");
      }

      return callback(null,troupe, fromUser);

    });
  });
}

function validateTroupeEmailAndReturnDistributionList(options, callback) {
  var from = options.from;
  var to = options.to;

  /* TODO: Make this email parsing better! */
  var uri = to.split('@')[0];
  var user = null;
  var troupe = null;

  userService.findByEmail(from, function(err, fromUser) {
    if(err) return callback(err);
    if(!fromUser) return callback("Access denied");

    findByUri(uri, function(err, troupe) {
      if(err) return callback(err);
      if(!troupe) return callback("Troupe not found for uri " + uri);
      if(!userHasAccessToTroupe(fromUser, troupe)) {
        return callback("Access denied");
      }

      userService.findByIds(troupe.users, function(err, users) {
        if(err) return callback(err);

        var emailAddresses = users.map(function(user) {
          return user.email;
        });

        return callback(null, troupe, fromUser, emailAddresses);
      });
    });
  });
}

function addInvite(troupe, senderDisplayName, displayName, email) {
  var code = uuid.v4();

  var invite = new persistence.Invite();
  invite.troupeId = troupe.id;
  invite.displayName = displayName;
  invite.email = email;
  invite.code = code;
  invite.save();

  var acceptLink = nconf.get("web:basepath") + "/" + troupe.uri + "/accept/" + code;

  mailerService.sendEmail({
    templateFile: "inviteemail",
    from: 'signup-robot@trou.pe',
    to: email,
    subject: "You been invited to join the " + troupe.name + " troupe",
    data: {
      displayName: displayName,
      troupeName: troupe.name,
      acceptLink: acceptLink,
      senderDisplayName: senderDisplayName
    }
  });

}

function findInviteById(id, callback) {
  persistence.Invite.findById(id, callback);
}

function findInviteByCode(code, callback) {
  persistence.Invite.findOne({code: code}, function(err, invite) {
    callback(err, invite);
  });
}

function findAllUnusedInvitesForTroupe(troupeId, callback) {
   persistence.Invite.where('troupeId').equals(troupeId)
      .where('status').equals('UNUSED')
      .sort({ displayName: 'asc', email: 'asc' } )
      .slaveOk()
      .exec(callback);
}

function removeUserFromTroupe(troupeId, userId, callback) {
   findById(troupeId, function(err, troupe) {
      troupe.users.remove(userId);
      troupe.save(callback);
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


/*
 * callback is function(err, request)
 */
function addRequest(troupeId, userId, callback) {
  persistence.Request.findOne({troupeId: troupeId, userId: userId}, function(err, request) {
    if(err) return callback(err);
    if(request) {
      /* Already exists */
      return callback(null, request);
    }

    request = new persistence.Request();
    request.troupeId = troupeId;
    request.userId = userId;
    request.save(function(err) {
      if(err) return callback(err);
      callback(null, request);
    });
  });
}

/*
 * callback is function(err, requests)
 */
function findAllOutstandingRequestsForTroupe(troupeId, callback) {
  persistence.Request
      .where('troupeId', troupeId)
      .where('status', 'PENDING')
      .slaveOk()
      .exec(callback);
}

function findPendingRequestForTroupe(troupeId, id, callback) {
  persistence.Request.findOne( {
    troupeId: troupeId,
    _id: id,
    status: 'PENDING'
  }, callback);
}

function acceptRequest(request, callback) {
  console.log(typeof request);

  findById(request.troupeId, function(err, troupe) {
    if(err) return callback(err);
    if(!troupe) { winston.error("Unable to find troupe", request.troupeId); return callback("Unable to find troupe"); }

    userService.findById(request.userId, function(err, user) {
      if(err) return callback(err);
      if(!user) { winston.error("Unable to find user", request.userId); return callback("Unable to find user"); }

      if(user.status === 'UNCONFIRMED' && !user.confirmationCode) {
         var confirmationCode = uuid.v4();
         user.confirmationCode = confirmationCode;
         user.save(function(err) {
          emailNotificationService.sendConfirmationforNewUserRequest(user, troupe);
         });
      }

      /** Add the user to the troupe */
      troupe.users.push(user.id);
      troupe.save(function(err) {
        if(err) winston.error("Unable to save troupe", err);

        request.remove();
        return callback(err, request);
      });

    });
  });
}


function rejectRequest(request, callback) {
  console.log(typeof request);
  findById(request.troupeId, function(err, troupe) {
    if(err) return callback(err);
    if(!troupe) { winston.error("Unable to find troupe", request.troupeId); return callback("Unable to find troupe"); }


    request.remove(function(err) {
      if(err) winston.error("Unable to save request", err);
      return callback(null);
    });
  });
}

module.exports = {
  findByUri: findByUri,
  findById: findById,
  findAllTroupesForUser: findAllTroupesForUser,
  validateTroupeEmail: validateTroupeEmail,
  validateTroupeEmailAndReturnDistributionList: validateTroupeEmailAndReturnDistributionList,
  userHasAccessToTroupe: userHasAccessToTroupe,
  addInvite: addInvite,
  findInviteById: findInviteById,
  findInviteByCode: findInviteByCode,
  acceptInvite: acceptInvite,
  findMemberEmails: findMemberEmails,
  findAllUnusedInvitesForTroupe: findAllUnusedInvitesForTroupe,
  addRequest: addRequest,
  findAllOutstandingRequestsForTroupe: findAllOutstandingRequestsForTroupe,
  findPendingRequestForTroupe: findPendingRequestForTroupe,
  acceptRequest: acceptRequest,
  rejectRequest: rejectRequest,
  removeUserFromTroupe: removeUserFromTroupe
};