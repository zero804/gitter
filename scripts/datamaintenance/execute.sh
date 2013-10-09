#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

set -e

MONGO_URL=$1
if [ -z "$MONGO_URL" ]; then MONGO_URL=troupe; fi


for i in $SCRIPT_DIR/*.js; do
	if ! mongo --quiet $MONGO_URL --eval "var modify = ${MODIFY-false};" $i; then
		echo $i required modifications
	fi
done
