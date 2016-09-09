#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

sleep 30

set -e
set -x

function resolve {
  ping -c 1 $1 | head -1  | cut -d "(" -f 2 | cut -d ")" -f 1
}

export INDEX_VERSION=01
export INDEX_NAME=gitter${INDEX_VERSION}
export USER_RIVER=gitterUserRiver${INDEX_VERSION}
export CHAT_RIVER=gitterChatRiver${INDEX_VERSION}
export ROOM_RIVER=gitterRoomRiver${INDEX_VERSION}
export GROUP_RIVER=gitterGroupRiver${INDEX_VERSION}
export ES_URL=http://elasticsearch:9200

while ! curl -q --fail "${ES_URL}"; do sleep 1; done

MONGO_HOST_1=$(resolve mongo1)
export MONGO_HOST_1
export MONGO_PORT_1=27017

MONGO_HOST_2=$(resolve mongo2)
export MONGO_HOST_2
export MONGO_PORT_2=27018

$SCRIPT_DIR/01-create-index-with-mapping
$SCRIPT_DIR/02-create-rivers
$SCRIPT_DIR/03-setup-alias
