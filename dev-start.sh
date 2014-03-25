#!/bin/bash -l

bash -l <<"DELIM"
	if [ -f ~/.bashrc ]; then source ~/.bashrc; fi
	if [ -f ~/.profile ]; then source ~/.profile; fi

	echo starting redis
	./redis.sh &

	echo starting mongo
	./mongodb.sh &

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

	echo starting node
	nodemon --watch server web.js

	echo starting interactive shell
DELIM

bash -il
