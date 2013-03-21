#!/bin/bash
set -e
shopt -s extglob

echo build.sh executing as user `whoami`
npm prune
npm install

grunt -no-color process

echo $GIT_COMMIT > GIT_COMMIT
echo $GIT_BRANCH > VERSION

./scripts/upgrade-data.sh

make test

if [ -d output ]; then rm -r output; fi

mkdir -p output

tar -cv !(@(node_modules|output|assets|mongo-backup-*))|gzip -9 - > output/troupe.tgz

