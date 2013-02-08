#!/bin/bash

mongodump --oplog --out mongo-backup-`date "+%Y-%m-%d.%H-%M-%S"`

find dataupgrades -type f -name "*.sh" -print0 | while read -d $'\0' file
do
  md5=`md5 -q "$file"`

  if [ `mongo troupe --quiet --eval "print(db.dataUpgrades.find({ \"script\":  \"$file\", \"md5\": \"$md5\"}).length())"` -eq 0 ]; then
    echo executing $file
    ./"$file"

    result=$?

    mongo troupe --quiet --eval "db.dataUpgradesExecutions.insert({ \"script\":  \"$file\", \"md5\": \"$md5\", executedAt: new Date(), result: \"$result\"})"

    if [ $result -eq 0 ]; then
      mongo troupe --quiet --eval "db.dataUpgrades.update({ \"script\":  \"$file\" }, { \"script\":  \"$file\", \"md5\": \"$md5\", executedAt: new Date() }, { \"upsert\": true } )"
    else
      exit $result
    fi;
  fi;

done



