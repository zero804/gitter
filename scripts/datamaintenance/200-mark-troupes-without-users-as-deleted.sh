#!/bin/bash

set -e

MONGO_URL=$1
if [ -z "$MONGO_URL" ]; then MONGO_URL=troupe; fi

mongo $MONGO_URL  <<"DELIM"
db.troupes.remove({ uri: /^testtroupe/ });
db.troupes.remove({ uri: 'filetesttroupe' });

db.troupes.remove({ oneToOne: false, uri: null });
db.troupes.remove({ oneToOne: false, uri: { $exists: false } });
db.troupes.remove({ oneToOne: { $exists: false }, uri: { $exists: false } });

db.troupes.update({ status: 'ACTIVE', users:[] }, { $set: { status: 'DELETED' } }, false, true);
DELIM
