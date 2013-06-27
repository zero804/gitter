#!/bin/bash

MONGO_URL=$1
if [ -z "$MONGO_URL" ]; then MONGO_URL=troupe; fi

# The password is 123456

# Add some test users
mongo --verbose $MONGO_URL <<"DELIM"

db.requests.find().forEach(function(f) {
  if(f.userId && !db.users.findOne({ _id: f.userId})) {
    print('Deleting ', f);
    db.requests.remove({userId: f.userId});
  }

  if(!db.troupes.findOne({ _id: f.troupeId })) {
    print('Deleting ', f);
    db.requests.remove({troupeId: f.troupeId});
  }
});

DELIM
