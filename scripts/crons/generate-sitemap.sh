#!/bin/bash
set -x

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SITEMAP_FILE=/tmp/gitter-sitemap.xml
rm -f $SITEMAP_FILE
./$SCRIPT_DIR/../generate-sitemap.js --sitemap $SITEMAP_FILE

gzip -9 $SITEMAP_FILE

aws s3 cp $SITEMAP_FILE s3://gitter-sitemap/$ENV/sitemap.xml --content-encoding gzip --acl public-read