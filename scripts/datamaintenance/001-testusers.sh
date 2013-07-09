#!/bin/bash

set -e

MONGO_URL=$1
if [ -z "$MONGO_URL" ]; then MONGO_URL=troupe; fi

mongo $MONGO_URL --quiet <<"DELIM"

var q = { email: /@troupetest.local$/ };
print('Deleting test users: ' + db.users.count(q));
db.users.remove(q);

DELIM
