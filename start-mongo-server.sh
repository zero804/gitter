#!/bin/bash

set -x

SERVER_NUMBER=$1

PORT=$((27017 + $SERVER_NUMBER))

mkdir -p "/usr/local/var/mongodb/r${SERVER_NUMBER}"
mongod run -replSet troupeSet --journal --port $PORT --dbpath "/usr/local/var/mongodb/r${SERVER_NUMBER}" --rest --profile=1 --slowms=15 --notablescan
