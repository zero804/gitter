var candidates = [];
var count = 0;
var removeIds = [];
var requiresModify = false;

/* Mongo 2.2 doesn't support Object.keys */

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
  { status: 'DELETED', users: { $not: { $size: 0 } } },
  'deleted_troupe_with_users',
  { $set: { users: [] } }
  );

addCandidates(
  { status: 'DELETED', dateDeleted: { $exists: false } },
  'delete_troupe_without_date_deleted',
  { $set: { dateDeleted: Date.now() } }
  );


var allUserIds = db.troupes.distinct('users.userId', { });
var existingUsers = db.users.find({ _id: { $in: allUserIds } }, { _id: 1 }).toArray().reduce(function(memo, index) { memo[index._id] = true; return memo; }, {});

var missingUsers = allUserIds.filter(function(userId) {
  return !existingUsers[userId];
});

db.troupes.find({ 'users.userId': { $in: missingUsers } }).forEach(function(t) {
  candidates.push({ reason: 'user_not_found', doc: t });
  requiresModify = true;
});

if(modify && missingUsers.length) {
  missingUsers.forEach(function(u, index) {
    if(index % 100 === 0) {
      print('Removing missing user ' + index + ' of ' + missingUsers.length);
    }
    db.troupes.update( { "users.userId": u }, { $pull: { users: { userId: u } } }, { multi: true });
  });
}

printjson({ candidates: candidates, summary: { scanned: count, invalid: candidates.length }});

quit(requiresModify ? 1 : 0);
