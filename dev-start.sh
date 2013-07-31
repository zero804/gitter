#!/bin/bash -l

bash -l <<"DELIM"
	if [ -f ~/.bashrc ]; then source ~/.bashrc; fi
	if [ -f ~/.profile ]; then source ~/.profile; fi

	echo starting redis
	./redis.sh &

	echo starting mongo
	./mongodb.sh &

	sleep 2

	echo starting node
	node-dev web

	echo starting interactive shell
DELIM
bash -il
