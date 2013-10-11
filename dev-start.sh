#!/bin/bash -l

bash -l <<"DELIM"
	if [ -f ~/.bashrc ]; then source ~/.bashrc; fi
	if [ -f ~/.profile ]; then source ~/.profile; fi

	echo starting redis
	./redis.sh &

	echo starting mongo
	./mongodb.sh &

	sleep 5

	echo starting node
	nodemon --watch server web.js

	echo starting interactive shell
DELIM
bash -il
