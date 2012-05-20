#!/bin/sh
# To initialise
# config = {_id: 'troupe', members: [
#                          {_id: 0, host: 'localhost:27017'},
#                          {_id: 1, host: 'localhost:27018'}]
# rs.initiate(config);
mongod run --config /usr/local/Cellar/mongodb/2.0.2-x86_64/mongod.conf -replSet troupeSet --journal --port 27017 --dbpath /usr/local/var/mongodb/r0 &
mongod run --config /usr/local/Cellar/mongodb/2.0.2-x86_64/mongod.conf -replSet troupeSet --journal --port 27018 --dbpath /usr/local/var/mongodb/r1 &
