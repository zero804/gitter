#!/bin/bash
redis-server --loglevel warning --port 6379 --unixsocket /tmp/redis.sock --unixsocketperm 755 &
redis-server --loglevel warning --port 6380 --slaveof 127.0.0.1 6379 &
redis-server ./config/sentinel.dev.conf --sentinel &
