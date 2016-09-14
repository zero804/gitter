#!/bin/bash

set -e
set -x

if [[ ${1:-} != "fast" ]]; then
  /usr/share/elasticsearch/bin/plugin --install elasticsearch/elasticsearch-mapper-attachments/2.5.0 || true
  /usr/share/elasticsearch/bin/plugin --install com.github.richardwilly98.elasticsearch/elasticsearch-river-mongodb/2.0.9 || true
  /usr/share/elasticsearch/bin/plugin --install mobz/elasticsearch-head || true
  /usr/share/elasticsearch/bin/plugin --install royrusso/elasticsearch-HQ || true
fi

if [[ -z "${ANNOUNCE_ES_HOST}" ]]; then
  exec /usr/share/elasticsearch/bin/elasticsearch
else
  exec /usr/share/elasticsearch/bin/elasticsearch --network.publish_host="${ANNOUNCE_ES_HOST}"
fi
