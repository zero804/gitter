#!/bin/bash

set -e
set -x

function join { local IFS="$1"; shift; echo "$*"; }

cmd=$(join " " "$@")

if [[ -n "$SU_TO_USER" ]]; then
  adduser --no-create-home --gecos "" --disabled-password $SU_TO_USER --uid $SU_TO_UID
  chown $SU_TO_USER output/

  PATH="$(pwd)/node_modules/.bin/:${PATH}"
  export PATH

  echo $PATH
  exec su $SU_TO_USER --preserve-environment -s '/bin/sh' -x -c "PATH=$PATH $cmd"
else
  PATH="$(pwd)/node_modules/.bin:${PATH}"
  export PATH

  exec /bin/sh -x -c "PATH=$PATH $cmd"
fi
