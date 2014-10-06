#!/bin/bash
set -e
set -x

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SITEMAP_FILE=${TMPDIR-/tmp}/gitter-sitemap.xml
rm -f $SITEMAP_FILE $SITEMAP_FILE.gz

$SCRIPT_DIR/../generate-sitemap.js --sitemap $SITEMAP_FILE

gzip -9 $SITEMAP_FILE

/usr/local/bin/aws s3 cp $SITEMAP_FILE.gz s3://gitter-sitemap/$NODE_ENV/sitemap.xml --content-encoding gzip --acl public-read

rm -f $SITEMAP_FILE $SITEMAP_FILE.gz


