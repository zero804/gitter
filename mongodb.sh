#!/bin/sh
# To initialise
# config = {_id: 'troupeSet', members: [
#                          {_id: 0, host: 'localhost:27017'},
#                          {_id: 1, host: 'localhost:27018'}]
# }
# rs.initiate(config);

# Remember to run ./scripts/init-mongo/init-mongo.sh the first time to init your replica set

mkdir /usr/local/var/mongodb/r0
mkdir /usr/local/var/mongodb/r1
mongod run -replSet troupeSet --journal --port 27017 --dbpath /usr/local/var/mongodb/r0 &
mongod run -replSet troupeSet --journal --port 27018 --dbpath /usr/local/var/mongodb/r1 &
