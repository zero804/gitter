#!/bin/bash
# To initialise
# config = {_id: 'troupeSet', members: [
#                          {_id: 0, host: 'localhost:27017'},
#                          {_id: 1, host: 'localhost:27018'}]
# }
# rs.initiate(config);

# Remember to run ./scripts/init-mongo/init-mongo.sh the first time to init your replica set

INSTANCE=$1

mkdir -p /usr/local/var/mongodb/r$INSTANCE
mongod run -replSet troupeSet --journal --port $((27017 + $INSTANCE)) --dbpath /usr/local/var/mongodb/r$INSTANCE --rest &
