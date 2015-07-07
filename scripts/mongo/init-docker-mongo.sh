#!/bin/bash

set -e
set -x

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

MONGODB1=`ping -c 1 mongo1 | head -1  | cut -d "(" -f 2 | cut -d ")" -f 1`
MONGODB2=`ping -c 1 mongo2 | head -1  | cut -d "(" -f 2 | cut -d ")" -f 1`
MONGODB3=`ping -c 1 mongo3 | head -1  | cut -d "(" -f 2 | cut -d ")" -f 1`

sleep 20

mongo --host ${MONGODB1}:27017 <<EOF
   var cfg = {
        "_id": "troupeSet",
        "version": 1,
        "members": [
            {
                "_id": 0,
                "host": "${MONGODB1}:27017",
                "priority": 2
            },
            {
                "_id": 1,
                "host": "${MONGODB2}:27017",
                "priority": 1
            },
            {
                "_id": 2,
                "host": "${MONGODB3}:27017",
                "priority": 1
            }
        ]
    };
    rs.initiate(cfg);
EOF

sleep 10

$SCRIPT_DIR/../dataupgrades/001-oauth-client/002-add-redirect-uri.sh $MONGODB1/gitter
