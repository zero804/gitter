var candidates = [];
var count = 0;
var removeIds = [];

db.users.find({ email: /@troupetest.local$|mister\.troupe@gmail.com/ }).forEach(function(d) {
  count++;
  candidates.push({ reason: 'test_user', doc: d });
  removeIds.push(d._id);
});

printjson({ candidates: candidates, summary: { scanned: count, invalid: candidates.length }});

if(modify && removeIds.length) {
  db.users.remove({ _id: { $in: removeIds } });
}

quit(removeIds.length ? 1 : 0);
