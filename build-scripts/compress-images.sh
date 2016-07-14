#!/usr/bin/env bash

set -euo pipefail
IFS=$'\n\t'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

compress_dir() {
  local dir_name=$1
  pushd . > /dev/null
  cd ${dir_name}
  pwd

  # zopflipng -m --iterations=15 --filters=0meb --prefix=zop_ *.png
  zopflipng --prefix=zop_ *.png
  for i in zop_*.png; do
    mv ${i} ${i#zop_}
  done
  popd
}

for i in $(find "${SCRIPT_DIR}/../public" -name '*.png' -exec dirname {} \;|sort -ur); do
  compress_dir ${i}
done
