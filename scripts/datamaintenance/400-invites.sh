#!/bin/bash

set -e

MONGO_URL=$1
if [ -z "$MONGO_URL" ]; then MONGO_URL=troupe; fi

# The password is 123456

# Add some test users
mongo $MONGO_URL <<"DELIM"
db.invites.remove({ email: /@troupetest.local$/ });
function invalidInvite(d) {
  if(d.status !== 'UNUSED') {
    if(d.status === 'USED' || d.status === 'INVALID') {
      var archivedInvite = db.inviteuseds.find({ _id: d._id });
      if(!archivedInvite) db.inviteuseds.create(d);
    }
    return 'invalid_status';
  }
  if(d.userId && !db.users.findOne({ _id: d.userId})) {
    return 'invitee_not_found';
  }
  if(d.fromUserId && !db.users.findOne({ _id: d.fromUserId})) {
    return 'inviter_not_found';
  }
  if(d.troupeId) {
    var troupe = db.troupes.findOne({ _id: d.troupeId});
    if(!troupe) {
      return 'troupe_not_found';
    } else {
      if(troupe.users.some(function(troupeUser) {
        return troupeUser.userId === d.userId;
      })) {
        return 'user_already_in_troupe';
      }
    }
  } else if(d.userId) {
    if(!d.fromUserId) {
      return 'from_user_missing';
    } else {
      var troupe = db.troupes.findOne({ oneToOne: true, $and: [{ "user.userId": d.fromUserId}, { "user.userId": d.userId } ] });
      if(troupe) {
        return 'already_connected';
      }
    }
  } else if(d.email) {
  } else {
    return 'invalid_form';
  }
  if(!d.userId && !d.email) {
    return 'invalid_form_2';
  }
}
var candidates = [];
db.invites.find().forEach(function(d) {
  var reason = invalidInvite(d);
  if(reason) {
    candidates.push({ reason: reason, doc: d });
    db.invites.remove({ _id: d._id });
  }
});
printjson(candidates);

DELIM
