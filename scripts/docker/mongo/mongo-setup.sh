#!/bin/bash

set -e
set -x

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

function resolve {
  ping -c 1 "$1" | head -1  | cut -d "(" -f 2 | cut -d ")" -f 1
}

ANNOUNCE_MONGO1_HOST=${ANNOUNCE_MONGO1_HOST:-$(resolve "mongo1")}
ANNOUNCE_MONGO2_HOST=${ANNOUNCE_MONGO2_HOST:-$(resolve "mongo2")}
ANNOUNCE_MONGO3_HOST=${ANNOUNCE_MONGO3_HOST:-$(resolve "mongo3")}

function mongoeval {
  mongo --host "${ANNOUNCE_MONGO1_HOST}" --quiet --eval "$1"
}

if [[ -z "$(mongoeval 'rs.isMaster().setname')" ]]; then
	echo Replicaset not initialised. Initialising

	mongo mongo1:27017/admin <<-DELIM
		rs.initiate({_id: 'troupeSet', members: [
                         {_id: 0, host: '${ANNOUNCE_MONGO1_HOST}:27017', priority: 2 },
                         {_id: 1, host: '${ANNOUNCE_MONGO2_HOST}:27018', priority: 1 },
                         {_id: 2, host: '${ANNOUNCE_MONGO3_HOST}:27019', arbiterOnly: true },
                ]});
	DELIM
fi

while [[ "$(mongoeval 'rs.isMaster().ismaster')" != "true" ]]; do
	echo Waiting for replicaset to come online
	sleep 0.5
done

SKIP_BACKUP=yes ${SCRIPT_DIR}/../../upgrade-data.sh "${ANNOUNCE_MONGO1_HOST}:27017" gitter

if [[ -n "${DISABLE_TABLE_SCAN}" ]]; then
  mongo --host "${ANNOUNCE_MONGO1_HOST}" --port 27017 --quiet --eval 'db.getSiblingDB("admin").runCommand( { setParameter: 1, notablescan: 1 } )'
  mongo --host "${ANNOUNCE_MONGO2_HOST}" --port 27018 --quiet --eval 'db.getSiblingDB("admin").runCommand( { setParameter: 1, notablescan: 1 } )'
  mongo --host "${ANNOUNCE_MONGO3_HOST}" --port 27019 --quiet --eval 'db.getSiblingDB("admin").runCommand( { setParameter: 1, notablescan: 1 } )'
fi
