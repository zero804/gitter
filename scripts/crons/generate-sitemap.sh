#!/bin/bash
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SITEMAP_FILE=$TMPDIR/gitter-sitemap.xml
rm -f $SITEMAP_FILE $SITEMAP_FILE.gz


$SCRIPT_DIR/../generate-sitemap.js --sitemap $SITEMAP_FILE

gzip -9 $SITEMAP_FILE

aws s3 cp $SITEMAP_FILE s3://gitter-sitemap/$NODE_ENV/sitemap.xml.gz --content-encoding gzip --acl public-read

rm -f $SITEMAP_FILE $SITEMAP_FILE.gz


