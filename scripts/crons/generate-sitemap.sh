#!/bin/bash
set -e
set -x

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
TEMP_DIR=${TMPDIR-/tmp}
rm -f $TEMP_DIR/sitemap*

$SCRIPT_DIR/../generate-sitemap.js --tempdir $TEMP_DIR --name sitemap
# will write:
# * sitemap.xml
# * sitemap-0.xml
# * sitemap-1.xml
# * sitemap-2.xml
# * ...

gzip -9 $TEMP_DIR/sitemap*
# should end up with
# * sitemap.xml.gz
# * sitemap-0.xml.gz
# * sitemap-1.xml.gz
# * sitemap-2.xml.gz

# * ...

# I'm worried about this. I mean sure it is a gzipped file, but what tells the
# browser that once you unzip it it is an xml file other than the file
# extension? If that's OK then why bother with content-encoding gzip in the
# first place? We could just link straight to sitemap-*.xml.gz
for f in $TEMP_DIR/sitemap*.xml.gz
do
  NAME=$(basename $f .gz)
  /usr/local/bin/aws s3 cp $f s3://gitter-sitemap/$NODE_ENV/$NAME --content-encoding gzip --acl public-read
done
# should copy
# /tmp/sitemap.xml.gz to sitemap.xml
# /tmp/sitemap-0.xml.gz to sitemap-0.xml
# /tmp/sitemap-1.xml.gz to sitemap-1.xml
# /tmp/sitemap-2.xml.gz to sitemap-2.xml


rm -f $TEMP_DIR/sitemap*


