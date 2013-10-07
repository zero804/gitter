var candidates = [];
var count = 0;
var removeIds = [];

db.troupes.find({ $or: [{ uri: /^testtroupe/ }, { uri: 'filetesttroupe' }]}).forEach(function(d) {
  count++;
  candidates.push({ reason: 'test_troupe', doc: d });
  removeIds.push(d._id);
});

db.troupes.find({ $or: [
  { oneToOne: false, uri: null },
  { oneToOne: false, uri: { $exists: false } },
  { oneToOne: { $exists: false }, uri: { $exists: false } }
  ]}).forEach(function(d) {
	count++;
	candidates.push({ reason: 'illegal_troupe', doc: d });
	removeIds.push(d._id);
});

db.troupes.find({ status: 'ACTIVE', users:[] }).forEach(function(d) {
  count++;
  candidates.push({ reason: 'no_users', doc: d });
  removeIds.push(d._id);
});

printjson({ candidates: candidates, summary: { scanned: count, invalid: candidates.length }});

if(modify && removeIds.length) {
  db.troupes.remove({ _id: { $in: removeIds } });
}

quit(removeIds.length ? 1 : 0);
