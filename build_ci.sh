#!/bin/bash
set -e
shopt -s extglob

echo build.sh executing as user `whoami`
npm prune
npm install || npm install --force

./node_modules/.bin/grunt -no-color process

./scripts/upgrade-data.sh

make test

if [ -f output ]; then rm -r output; fi
mkdir output
tar -cv !(@(node_modules|output|assets))|gzip -9 - > output/troupe.tgz

