#!/bin/bash
# To initialise
# config = {_id: 'troupeSet', members: [
#                          {_id: 0, host: 'localhost:27017'},
#                          {_id: 1, host: 'localhost:27018'}]
# }
# rs.initiate(config);

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Remember to run ./scripts/init-mongo/init-mongo.sh the first time to init your replica set
rm -f /usr/local/var/log/mongodb/mongo.log

ulimit -n 1000
mkdir -p /usr/local/var/mongodb/r0
mkdir -p /usr/local/var/mongodb/r1

mongod run \
  --config $SCRIPT_DIR/config/mongo-server.one.yml \
  --profile=1 \
  --slowms=15 &

mongod run \
  --config $SCRIPT_DIR/config/mongo-server.two.yml \
  --profile=1 \
  --slowms=15 &
