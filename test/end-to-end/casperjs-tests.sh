#!/bin/bash

set -e

export SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

mkdir -p $SCRIPT_DIR/../../output/test-reports/

$SCRIPT_DIR/casperjs/bin/casperjs test --xunit=$SCRIPT_DIR/../../output/test-reports/casper.xml \
                    --includes=$SCRIPT_DIR/casper/inc.js \
                    $SCRIPT_DIR/casper/tests/ \
                    $@
