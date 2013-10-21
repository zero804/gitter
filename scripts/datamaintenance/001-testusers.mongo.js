var candidates = [];
var count = 0;
var removeIds = [];

db.users.find({ email: /@troupetest.local$|mister\.troupe@gmail.com/ }).forEach(function(d) {
  count++;
  candidates.push({ reason: 'test_user', doc: d });
  removeIds.push(d._id);
});

db.users.aggregate( { $group: { _id: '$email', count: { $sum: 1 } }  }, { $match: { count: { $gt: 1 } } }).result
  .forEach(function(i) {
    db.users.find({ email: i._id }).forEach(function(d) {
      count++;
      candidates.push({ reason: 'duplicate_email', doc: d });
      requiresModify = true;
    });
  });

printjson({ candidates: candidates, summary: { scanned: count, invalid: candidates.length }});

if(modify && removeIds.length) {
  db.users.remove({ _id: { $in: removeIds } });
}

quit(removeIds.length ? 1 : 0);
