#!/bin/bash

/usr/local/Cellar/elasticsearch/0.19.2/bin/plugin -install elasticsearch/elasticsearch-mapper-attachments/1.4.0
/usr/local/Cellar/elasticsearch/0.19.2/bin/plugin -install richardwilly98/elasticsearch-river-mongodb/1.1.0

curl -XPUT "localhost:9200/_river/mongogridfs/meta" -d'
{
  type: "mongodb",
    mongodb: {
      db: "troupe", 
      collection: "fs.files", 
      gridfs: true
    },
    index: {
      name: "testmongo", 
      type: "files"
    }
}'

curl -XPUT "localhost:9200/_river/emails/meta" -d'
{
  type: "mongodb",
    mongodb: {
      db: "troupe", 
      collection: "emails", 
      gridfs: false
    },
    index: {
      name: "emails", 
      type: "email"
    }
}'
