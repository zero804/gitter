#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

sleep 30

set -e
set -x

set

MONGODB1=`ping -c 1 mongo1 | head -1  | cut -d "(" -f 2 | cut -d ")" -f 1`
MONGODB2=`ping -c 1 mongo2 | head -1  | cut -d "(" -f 2 | cut -d ")" -f 1`
ELASTICSEARCH=`ping -c 1 elasticsearch | head -1  | cut -d "(" -f 2 | cut -d ")" -f 1`
# MONGODB3=`ping -c 1 mongo3 | head -1  | cut -d "(" -f 2 | cut -d ")" -f 1`

export INDEX_VERSION=01
export INDEX_NAME=gitter${INDEX_VERSION}
export USER_RIVER=gitterUserRiver${INDEX_VERSION}
export CHAT_RIVER=gitterChatRiver${INDEX_VERSION}
export ROOM_RIVER=gitterRoomRiver${INDEX_VERSION}
export ES_URL=http://$ELASTICSEARCH:9200

export MONGO_HOST_1=$MONGODB1
export MONGO_PORT_1=27017

export MONGO_HOST_2=$MONGODB2
export MONGO_PORT_2=27018

$SCRIPT_DIR/01-create-index-with-mapping
$SCRIPT_DIR/02-create-rivers
$SCRIPT_DIR/03-setup-alias
