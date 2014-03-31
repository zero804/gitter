var candidates = [];
var count = 0;
var removeIds = [];

function nullOrNotExists(name) {
  var a = { };
  var b = { };
  a[name] = { $exists: false };
  b[name] = null;

  return { $or: [a, b] };
}

function existsAndNotNull(name) {
  var a = { };
  var b = { };
  a[name] = { $exists: true };
  b[name] = null;

  return { $or: [a, { $not: b }] };
}

db.urilookups.find({ $and: [ existsAndNotNull('troupeId'), existsAndNotNull('userId')] }).forEach(function(u) {
  candidates.push({ reason: 'bad_ref_1', doc: u });
  removeIds.push(u._id);
});

db.urilookups.find({ $and: [ nullOrNotExists('troupeId'), nullOrNotExists('userId')] }).forEach(function(u) {
  candidates.push({ reason: 'bad_ref_2', doc: u });
  removeIds.push(u._id);
});

var userIds = db.urilookups.find(existsAndNotNull('userId'), { _id: 0, userId: 1 }).map(function(u) { return u.userId; });

var existingUsers = db.users.find({ _id: { $in: userIds } }, { _id: 1 }).toArray().reduce(function(memo, index) { memo[index._id] = true; return memo; }, {});

var missingUsers = userIds.filter(function(userId) {
  return !existingUsers[userId];
});

db.urilookups.find({ userId: { $in: missingUsers } }).forEach(function(u) {
  candidates.push({ reason: 'user_missing', doc: u });
  removeIds.push(u._id);
});

var troupeIds = db.urilookups.find(existsAndNotNull('troupeId'), { _id: 0, troupeId: 1 }).map(function(u) { return u.troupeId; });

var existingTroupes = db.troupes.find({ _id: { $in: troupeIds } }, { _id: 1 }).toArray().reduce(function(memo, index) { memo[index._id] = true; return memo; }, {});

var missingTroupes = troupeIds.filter(function(troupeId) {
  return !existingTroupes[troupeId];
});

db.urilookups.find({ troupeId: { $in: missingTroupes } }).forEach(function(u) {
  candidates.push({ reason: 'troupe_missing', doc: u });
  removeIds.push(u._id);
});

printjson({ candidates: candidates, summary: { scanned: count, invalid: candidates.length }});

if(modify && removeIds.length) {
  db.urilookups.remove({ _id: { $in: removeIds } });
}

quit(removeIds.length ? 1 : 0);
