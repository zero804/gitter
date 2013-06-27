#!/bin/bash

MONGO_URL=$1
if [ -z "$MONGO_URL" ]; then MONGO_URL=troupe; fi

mongo $MONGO_URL  <<"DELIM"
db.troupes.update({ status: 'ACTIVE', users:[] }, { $set: { status: 'DELETED' } });
DELIM
