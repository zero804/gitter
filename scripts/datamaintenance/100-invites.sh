#!/bin/bash

MONGO_URL=$1
if [ -z "$MONGO_URL" ]; then MONGO_URL=troupe; fi

# The password is 123456

# Add some test users
mongo --verbose $MONGO_URL <<DELIM

db.invites.find().forEach(function(d) {
  if(d.userId && !db.users.findOne({ _id: d.userId})) {
    print('Deleting ', d);
    db.invites.remove({ userId: d.userId });
   }
});

DELIM
