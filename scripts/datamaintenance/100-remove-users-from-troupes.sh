#!/bin/bash

MONGO_URL=$1
if [ -z "$MONGO_URL" ]; then MONGO_URL=troupe; fi

mongo --verbose $MONGO_URL <<"DELIM"

db.troupes.find({}).forEach(function(f) {
  print('Updating' + f);

  f.users.forEach(function(user) {
    if(!db.users.findOne({ _id: user.userId})) {
      print('Removing user ' + user.userId);
      db.troupes.update( { _id: { $exists: true }, { $pull: { users: { userId: user.userId } } });
    }
  });
});

DELIM
