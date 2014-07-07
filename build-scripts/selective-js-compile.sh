#!/bin/bash

set -e

ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && cd .. && pwd )"

generate_md5() {
  if [[ -x $(which md5) ]]; then
    md5 -q $1
  else
    md5sum $1 |cut -d\  -f1
  fi
}

for i in $(find $ROOT_DIR/public-processed/js -maxdepth 1 -name '*.js' ! -name '*.min.js'); do 
  min_file=${i%.js}.min.js
  md5_file=$i.md5  
  md5_checksum=$(generate_md5 $i)
    
  if [[ ! -f $md5_file ]] || [[ ! -f $min_file ]] || [[ $md5_checksum != $(cat $md5_file) ]]; then
    echo $i needs updating >&2
    
    rm -f $min_file ${min_file}.gz ${min_file}.map ${min_file}.map.gz
    nice grunt closure --closureModule $(basename $i) &
    echo $md5_checksum > $md5_file 
  fi
done

wait

for i in $(find $ROOT_DIR/public-processed/js -name '*.js' ! -name '*.min.js'); do 
  min_file=${i%.js}.min.js
  if [[ ! -f $min_file ]]; then
    echo Missing $min_file >&2
    exit 1
  fi
done
