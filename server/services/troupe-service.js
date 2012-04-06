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

function findAllTroupesForUser(userId, callback) {
  persistence.Troupe
    .where('users', userId)
    .asc('name')
    .slaveOk()
    .run(callback);
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
      .asc('displayName', 'email')
      .slaveOk()
      .run(callback);
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
  findAllUnusedInvitesForTroupe: findAllUnusedInvitesForTroupe
};