#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

set -e

MONGO_HOST=${1-localhost}
BUCKET=${2-s3://troupe-backup-prod}

if [ -z "$MONGO_HOST" ]; then MONGO_HOST=localhost; fi

BACKUP_NAME=mongo-backup-`date "+%Y-%m-%d.%H-%M-%S"`
BACKUP_NAME_TGZ=$BACKUP_NAME.tgz

mongodump --host localhost --oplog -out $BACKUP_NAME

tar -cvzf $BACKUP_NAME_TGZ $BACKUP_NAME
rm -rf $BACKUP_NAME

s3cmd put $BACKUP_NAME_TGZ $BUCKET

rm -r $BACKUP_NAME_TGZ
