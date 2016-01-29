#!/bin/bash

set -e
set -x

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

function mongoeval {
  mongo --host mongo1 --quiet --eval $1
}

function resolve {
  ping -c 1 $1 | head -1  | cut -d "(" -f 2 | cut -d ")" -f 1
}

while [[ "$(mongoeval 'db.serverStatus().ok') || echo 0" = "0" ]]; do
	echo Waiting for replicaset to come online
	sleep 1
done

if [[ "$(mongoeval 'rs.status().ok')" != "1" ]]; then
	echo Replicaset not initialised. Initialising

  ANNOUNCE_MONGO1_HOST=$(resolve "mongo1")
  ANNOUNCE_MONGO2_HOST=$(resolve "mongo2")
  ANNOUNCE_MONGO3_HOST=$(resolve "mongo3")

	mongo mongo1:27017/admin <<-DELIM
		rs.initiate({_id: 'troupeSet', members: [
                         {_id: 0, host: '${ANNOUNCE_MONGO1_HOST}:27017', priority: 2 },
                         {_id: 1, host: '${ANNOUNCE_MONGO2_HOST}:27018', priority: 1 },
                         {_id: 2, host: '${ANNOUNCE_MONGO3_HOST}:27019', arbiterOnly: true },
                ]});
	DELIM

	mongoeval 'printjson(rs.status())';

	while [[ "$(mongoeval 'rs.status().myState')" != "1" ]]; do
		echo Waiting for replicaset to come online
		mongoeval 'printjson(rs.status())';
		sleep 1
	done
fi

SKIP_BACKUP=yes ${SCRIPT_DIR}/../../upgrade-data.sh mongo1 gitter
