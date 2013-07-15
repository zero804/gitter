#!/bin/bash

set -e

MONGO_URL=$1
if [ -z "$MONGO_URL" ]; then MONGO_URL=troupe; fi

mongo $MONGO_URL --quiet <<"DELIM"

var count = 0;

db.troupes.update( { _id: { $exists: true } }, { $pull: { users: { userId: { $exists: false } } } }, false, true);

db.troupes.find().forEach(function(f) {
  f.users.forEach(function(user) {
    if(user.userId) {
      var r = db.users.findOne({ _id: user.userId});
      if(r === null) {
        count++;
        db.troupes.update( { "users.userId": user.userId }, { $pull: { users: { userId: user.userId } } }, { multi: true });
      }
    }
  });
});

print('Removed missing users from troupes: ' + count);

var q = { oneToOne: false, uri: null };
print('Marking group troupes without a URI as DELETED: ' + db.troupes.count(q));
db.troupes.update(q, { $set: { status: 'DELETED' } }, false, true)


var q = { oneToOne:true, status: 'ACTIVE', users: { $size: 1 } };
print('Marking oneToOne troupes with one user as DELETED: ' + db.troupes.count(q));
db.troupes.update(q, { $set: { status: 'DELETED', users: [] } }, false, true)

var q = { status: 'ACTIVE', users: { $size: 0 } };
print('Marking active troupes with no users as DELETED: ' + db.troupes.count(q));
db.troupes.update(q, { $set: { status: 'DELETED' } }, false, true)

var q = { oneToOne:true, status: 'DELETED', users: { $size: { $gt: 0} } }
print('Removing users from deleted troupes: ' + db.troupes.count(q));
db.troupes.update(q, { $set: { users: [] } }, false, true)

var q = { status: 'DELETED', dateDeleted: { $exists: false } };
print('Removing DELETED troupes without a dateDeleted: ' + db.troupes.count(q));
db.troupes.remove(q);

print('completed successfully');

DELIM



