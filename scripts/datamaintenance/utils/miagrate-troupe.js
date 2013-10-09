function migrateTroupe(fromTroupeId, toTroupeId) {
  [['chatmessages', 'toTroupeId'],
   'invites',
   'requests',
   'conversations',
   'files'
  ].forEach(function(d) {
    var query = {}, update = { $set: { } };
    var attr, collection;

    if(Array.isArray(d)) {
      collection = d[0];
      attr = d[1];
    } else {
      collection = d;
      attr = 'troupeId';
    }

    query[attr] = fromTroupeId;
    update.$set[attr] = toTroupeId;

    db[collection].update({ toTroupeId: fromTroupeId },   { $set: { toTroupeId: toTroupeId }}, { multi: true });
  });

}