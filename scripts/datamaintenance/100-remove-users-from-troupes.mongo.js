var candidates = [];
var count = 0;
var removeIds = [];
var requiresModify = false;

/* Mongo 2.2 doesn't support Object.keys */
function keys(obj) {
  var result = [];
  for(var i in obj) {
    if(obj.hasOwnProperty(i)) {
      result.push(i);
    }
  }
  return result;
}

function hashTroupeUsers() {
  var allUsers = db.troupes.find({}, { _id: 0, 'users.userId': 1 } ).
    map(function(users) {
      return users.users;
    });

    var memo = {};
    if(allUsers) {
      allUsers.forEach(function(val) {
        if(val) {
          val.forEach(function(troupeUser) {
            if(troupeUser.userId.valueOf()) {
              memo[troupeUser.userId.valueOf()] = true;
            }
          });
        }
      });

    }

    return memo;
}

function findMissingTroupeUsers() {
  var troupeUsers = hashTroupeUsers();

  db.users.find({ _id: { $in: keys(troupeUsers).map(function(d) { return new ObjectId(d); }) } }, { _id: 1 }).
    forEach(function(user) {
      delete troupeUsers[user._id.valueOf()];
    });

  return keys(troupeUsers).map(function(d) { return new ObjectId(d); });
}

function addCandidates(query, reason, update) {
  db.troupes.find(query).forEach(function(d) {
    count++;
    candidates.push({ reason: reason, doc: d });
    requiresModify = true;
  });

  if(modify) {
    db.troupes.update(query, update, false, true);
  }

}

addCandidates(
  { users: { userId: { $exists: false } } },
  'missing_user_id',
  { $pull: { users: { userId: { $exists: false } } } }
  );

// Find users referenced in troupes who arent in the users collection
var missingUserIds = findMissingTroupeUsers();

if(missingUserIds.length) {
  db.troupes.find({ users: { $size: { $gt: 0 } }, 'users.userId': { $in: missingUserIds } }).forEach(function(d) {
    count++;
    candidates.push({ reason: 'user_not_found', doc: d });
    requiresModify = true;
  });

  if(modify) {
    missingUserIds.forEach(function(id) {
      db.troupes.update( { "users.userId": id }, { $pull: { users: { userId: id } } }, { multi: true });
    });
  }
}

addCandidates(
  { oneToOne: false, uri: null },
  'no_uri',
  { $set: { status: 'DELETED' } }
  );

addCandidates(
  { oneToOne:true, status: 'ACTIVE', users: { $size: 1 } },
  'one_to_none',
  { $set: { status: 'DELETED', users: [] } }
  );

addCandidates(
  { status: 'ACTIVE', users: { $size: 0 } },
  'no_users',
  { $set: { status: 'DELETED' } }
  );

addCandidates(
  { status: 'DELETED', users: { $not: { $size: 0 } } },
  'deleted_troupe_with_users',
  { $set: { users: [] } }
  );

addCandidates(
  { status: 'DELETED', dateDeleted: { $exists: false } },
  'delete_troupe_without_date_deleted',
  { $set: { dateDeleted: Date.now() } }
  );

printjson({ candidates: candidates, summary: { scanned: count, invalid: candidates.length }});

quit(requiresModify ? 1 : 0);
