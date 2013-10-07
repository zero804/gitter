
var candidates = [];
var count = 0;
var removeIds = [];

function getTestTroupeIds() {
  return db.troupes.find({ uri: /testtroupe/ },{_id: 1 }).map(function(d) { return d._id; });
}

db.requests.find().forEach(function(f) {
  count++;
  if(f.userId && !db.users.count({ _id: f.userId})) {
    candidates.push({ reason: 'missing_user', doc: d });
    removeIds.push(d._id);
  }

  if(!db.troupes.count({ _id: f.troupeId })) {
    candidates.push({ reason: 'missing_troupe', doc: d });
    removeIds.push(d._id);
  }
});

db.requests.find({ troupeId: { $in: getTestTroupeIds() } }).forEach(function(d) {
  count++;
  candidates.push({ reason: 'test_troupe_request', doc: d });
  removeIds.push(d._id);
});

if(modify && removeIds.length) {
  db.requests.remove({ _id: { $in: removeIds } });
}

printjson({ candidates: candidates, summary: { scanned: count, invalid: candidates.length }});

quit(removeIds.length ? 1 : 0);
