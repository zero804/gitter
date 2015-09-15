#!/bin/bash

set -e
set -x

/usr/share/elasticsearch/bin/plugin --install elasticsearch/elasticsearch-mapper-attachments/2.5.0
/usr/share/elasticsearch/bin/plugin --install com.github.richardwilly98.elasticsearch/elasticsearch-river-mongodb/2.0.9

exec /usr/share/elasticsearch/bin/elasticsearch --network.publish_host="$ES_PUBLISH_HOST"
