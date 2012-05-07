#!/bin/sh
DIR="$( cd "$( dirname "$0" )" && pwd )"
node-dev $DIR/node_modules/.bin/haraka -c $DIR/haraka

