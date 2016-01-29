#!/bin/bash

set -e
set -x

function join { local IFS="$1"; shift; echo "$*"; }

if [[ -n "$SU_TO_USER" ]]; then
  adduser --no-create-home --gecos "" --disabled-password $SU_TO_USER --uid $SU_TO_UID
  cmd=$(join " " "$@")
  chown $SU_TO_USER output/
  exec su $SU_TO_USER -c "$cmd"
else
  exec "$@"
fi
