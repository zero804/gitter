#!/bin/bash

echo starting redis
(./redis.sh > /dev/null) &

echo starting mongo
(./mongodb.sh > /dev/null) &

sleep 10

if [ "$(mongo --quiet --eval 'rs.status().ok')" -eq "0" ]; then
	echo Replicaset not initialised. Initialising
	./scripts/mongo/init-dev-mongo.sh

	while [ "$(mongo --quiet --eval 'rs.status().ok')" -eq "0" ]; do
		echo Waiting for replicaset to come online
		mongo --eval 'printjson(rs.status())';
		sleep 1
	done

	./scripts/upgrade-data.sh

else
	while [ "$(mongo --quiet --eval 'rs.status().ok')" -eq "0" ]; do
		echo Waiting for replicaset to come online
		sleep 1
	done
fi

