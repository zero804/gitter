function invalidInvite(d) {
  if(d.email && d.email.match(/@troupetest.local$/)) {
    return "test_email";
  }

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
      if(db.troupes.count({ oneToOne: true, $and: [{ "users.userId": d.fromUserId}, { "users.userId": d.userId } ] })) {
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
var count = 0;
var removeIds = [];

db.invites.find().forEach(function(d) {
  count++;

  var reason = invalidInvite(d);
  if(reason) {
    candidates.push({ reason: reason, doc: d });
    removeIds.push(d._id);
  }
});

printjson({ candidates: candidates, summary: { scanned: count, invalid: candidates.length }});

if(modify && removeIds.length) {
  db.invites.remove({ _id: { $in: removeIds } });
}
quit(removeIds.length ? 1 : 0);
