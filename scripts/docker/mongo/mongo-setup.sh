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

seconds=10
echo "Waiting for mongo to be online. I'll give it $seconds seconds."
while [[ $seconds > 0 ]]; do
  if [[ "$(mongoeval 'db.hostInfo().ok')" -eq 1 ]]; then
    break
  fi
  sleep 1
  seconds=$((seconds - 1))
  if [[ $seconds -eq 0 ]]; then
    echo "Timeout waiting for mongo to come up. Exiting with rc 1."
    exit 1
  fi
done

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

attempts=30
echo "Waiting for replica set to come online. I'll give it $attempts attempts."
while [[ $attempts > 0 ]]; do
  if [[ "$(mongoeval 'rs.isMaster().ismaster')" == "true" ]]; then
    break
  fi
  attempts=$((attempts - 1))
  echo "Attempt failed. $attempts attempts left. Retrying in half a second."
  sleep 0.5
  if [[ $attempts -eq 0 ]]; then
    echo "Timeout waiting for the replica set. Exiting with rc 1."
    exit 1
  fi
done

SKIP_BACKUP=yes ${SCRIPT_DIR}/../../upgrade-data.sh "${ANNOUNCE_MONGO1_HOST}:27017" gitter

if [[ -n "${DISABLE_TABLE_SCAN}" ]]; then
  mongo --host "${ANNOUNCE_MONGO1_HOST}" --port 27017 --quiet --eval 'db.getSiblingDB("admin").runCommand( { setParameter: 1, notablescan: 1 } )'
  mongo --host "${ANNOUNCE_MONGO2_HOST}" --port 27018 --quiet --eval 'db.getSiblingDB("admin").runCommand( { setParameter: 1, notablescan: 1 } )'
  mongo --host "${ANNOUNCE_MONGO3_HOST}" --port 27019 --quiet --eval 'db.getSiblingDB("admin").runCommand( { setParameter: 1, notablescan: 1 } )'
fi
