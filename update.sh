#!/bin/bash

set -e

for i in `ack -l "require\(.winston.\)" --js server`; do
  d=`dirname $i`
  relative=`python -c "import os.path; print os.path.relpath('/Users/andrewn/code/gitter-webapp/server/utils/winston', '$d')"`

  if [[ $relative  =~ ^\..* ]]; then
    echo
  else
    relative=./$relative
  fi

  p=${relative//\//\\/}

  sed -i.bak -e  "s/require..winston../require('$p')/" $i
done;