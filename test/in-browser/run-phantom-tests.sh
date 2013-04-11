#!/bin/bash

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [ -z "$BASE_URL" ]; then
  echo Defaulting base url to http://localhost:5000
  BASE_URL=http://localhost:5000
fi

if [ ! -z "$GENERATE_XUNIT" ]; then
  mkdir -p ../../output/test-reports/
fi

for i in $SCRIPT_DIR/*-test.js
do
  testname=`basename ${i}`
  echo executing $BASE_URL/test/in-browser/test/${testname%.js}
  if [ -z "$GENERATE_XUNIT" ]; then
    $SCRIPT_DIR/../../node_modules/.bin/mocha-phantomjs $BASE_URL/test/in-browser/test/${testname%.js}
  else
    $SCRIPT_DIR/../../node_modules/.bin/mocha-phantomjs -R xunit $BASE_URL/test/in-browser/test/${testname%.js} > ../../output/test-reports/inbrowser-${testname%.js}.xml
  fi
done