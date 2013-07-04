#!/bin/bash

MONGO_URL=$1
if [ -z "$MONGO_URL" ]; then MONGO_URL=troupe; fi

# The password is 123456

# Add some test users
mongo $MONGO_URL <<"DELIM"

db.requests.find().forEach(function(f) {
  if(f.userId && !db.users.findOne({ _id: f.userId})) {
    db.requests.remove({userId: f.userId});
  }

  if(!db.troupes.findOne({ _id: f.troupeId })) {
    db.requests.remove({troupeId: f.troupeId});
  }
});

var troupe3 = db.troupes.findOne({ uri: 'testtroupe3' });
if(troupe3) {
  db.requests.remove({ troupeId: troupe3._id });
}

DELIM
