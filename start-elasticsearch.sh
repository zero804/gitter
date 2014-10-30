#!/bin/bash -ex

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

export CONF_DIR=${SCRIPT_DIR}/config/elasticsearch-dev/
elasticsearch -Des.path.conf=${SCRIPT_DIR}/config/elasticsearch-dev/
 #-Des.config=${SCRIPT_DIR}/config/elasticsearch-dev/elasticsearch.yml
