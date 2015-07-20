#!/bin/bash

if [[ ! -f config/sentinel.dev.conf ]]; then
  cp ./config/sentinel.dev.conf.template ./config/sentinel.dev.conf
fi

redis-server --loglevel warning --port 6379 --unixsocket /tmp/redis.sock --unixsocketperm 755i --bind 127.0.0.1 &
redis-server --loglevel warning --port 6380 --slaveof 127.0.0.1 6379 --bind 127.0.0.1 &
redis-server ./config/sentinel.dev.conf --sentinel --bind 127.0.0.1 &
