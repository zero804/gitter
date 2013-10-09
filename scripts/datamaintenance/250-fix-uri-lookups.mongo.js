var candidates = [];
var count = 0;
var removeIds = [];

db.urilookups.find().forEach(function(u) {
	count++;
	if(u.userId && u.troupeId) {
    candidates.push({ reason: 'bad_ref_1', doc: u });
    removeIds.push(u._id);

		return;
	}

	if(u.userId) {
		if(db.users.count({ _id : u.userId }) === 0) {
      candidates.push({ reason: 'user_missing', doc: u });
      removeIds.push(u._id);
		}

		return;
	}

	if(u.troupeId) {
		if(db.troupes.count({ _id : u.troupeId }) === 0) {
      candidates.push({ reason: 'troupe_missing', doc: u });
      removeIds.push(u._id);
		}
		return;
	}

  candidates.push({ reason: 'bad_ref_2', doc: u });
  removeIds.push(u._id);
});

printjson({ candidates: candidates, summary: { scanned: count, invalid: candidates.length }});

if(modify && removeIds.length) {
  db.urilookups.remove({ _id: { $in: removeIds } });
}

quit(removeIds.length ? 1 : 0);
