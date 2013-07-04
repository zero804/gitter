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


print('Removed ' + count + ' users from troupes');

db.troupes.update({ oneToOne:true, status: 'ACTIVE', users: { $size: 1 } }, { $set: { status: 'DELETED', users: [] } }, false, true)
db.troupes.update({ oneToOne:true, status: 'DELETED', users: { $size: 1 } }, { $set: { users: [] } }, false, true)


db.troupes.update({ status: 'ACTIVE', users: { $size: 0 } }, { $set: { status: 'DELETED' } }, false, true)

print('completed successfully');

DELIM



